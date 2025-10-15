const Game = require("./Game");
const { setupMatchmaking } = require("./matchmaking");

const games = new Map();
const socketRateLimiter = new Map();

// Rate limiting для Socket.IO событий
const checkSocketRateLimit = (socket, event) => {
  const key = `${socket.id}:${event}`;
  const now = Date.now();

  // Разные лимиты для разных типов событий
  let limit, window;

  // Визуальные события (движения кия) - высокий лимит
  const visualEvents = ['_onPressHitArea', '_onPressMoveHitArea', '_onReleaseHitArea', 'updateStick'];
  if (visualEvents.includes(event)) {
    limit = 1000; // 1000 событий (движения мыши очень частые)
    window = 10000; // за 10 секунд
  } else {
    // Критические события (создание комнаты, присоединение) - низкий лимит
    limit = 50; // 50 событий
    window = 60000; // за 60 секунд
  }

  if (!socketRateLimiter.has(key)) {
    socketRateLimiter.set(key, { count: 1, resetTime: now + window });
    return true;
  }

  const data = socketRateLimiter.get(key);

  if (now > data.resetTime) {
    socketRateLimiter.set(key, { count: 1, resetTime: now + window });
    return true;
  }

  if (data.count >= limit) {
    console.log(`⚠️ Rate limit exceeded for ${socket.id} on ${event}`);
    return false;
  }

  data.count++;
  return true;
};

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of socketRateLimiter.entries()) {
    if (now > data.resetTime) {
      socketRateLimiter.delete(key);
    }
  }
}, 5 * 60 * 1000);

const gameSocket = (io) => {
  console.log("🎯 Matchmaking system initialized");

  io.on("connection", (socket) => {
    // Настраиваем обработчики матчмейкинга для этого сокета
    setupMatchmaking(socket, io, games);

    socket.on("createroom-req", (data) => {
      // Rate limiting
      if (!checkSocketRateLimit(socket, "createroom-req")) {
        socket.emit("error", { message: "Too many requests" });
        return;
      }

      var roomid = socket.id;
      const keyExists = games.has(roomid);
      if (!keyExists) {
        games.set(roomid, new Game(io, roomid, data));
        games.get(roomid).joinroom(socket);

        socket.emit("createroom-res", {
          roomid,
          success: true,
        });
        if (!data.isPrivate) {
          io.emit("add-room", {
            roomid: roomid,
            players: [{ key: "player1", playerid: socket.id }],
            betamount: data.amount,
          });
        }
      } else {
        socket.emit("createroom-res", {
          msg: "already exists",
          success: false,
        });
      }
    });

    socket.on("joinroom-req", (id) => {
      // Rate limiting
      if (!checkSocketRateLimit(socket, "joinroom-req")) {
        socket.emit("error", { message: "Too many requests" });
        return;
      }
      if (!id) {
        games.forEach((r) => {
          if (!id && r.getPlayerCount() < 2) {
            id = r.getRoomId();
          }
        });
      }

      const keyExists = games.has(id);
      if (keyExists) {
        games.get(id).joinroom(socket);
      } else {
        socket.emit("joinroom-res", { msg: "not exists", success: false });
      }
    });

    socket.on("leaveroom-req", (id) => {
      id = id || socket.roomid;
      const keyExists = games.has(id);
      if (keyExists) {
        var room = games.get(id);
        room.leaveroom(socket, id);
        if (room.getPlayerCount() == 0) {
          // ИСПРАВЛЕНИЕ УТЕЧКИ ПАМЯТИ: Вызываем destroy() перед удалением
          console.log(`🗑️ Room ${id} is empty, destroying...`);
          room.destroy();
          games.delete(id);

          io.emit("remove-room", { roomid: id });
          console.log(`✅ Room ${id} deleted and cleaned up`);
        }
      } else {
        socket.emit("leaveroom-res", "NOT EXISTS ROOM");
      }
    });

    socket.on("getall-room", () => {
      socket.emit(
        "setall-room",
        Array.from(games)
          .filter((room) => !room[1].getRoomPermission())
          .map((room) => {
            return {
              roomid: room[0],
              players: room[1].getPlayers(),
              betamount: room[1].getBetAmount(),
            };
          })
      );
    });

    socket.on("disconnect", function () {
      if (socket.roomid) {
        var room = games.get(socket.roomid);
        if (room) {
          room.leaveroom(socket, socket.roomid);
          if (room.getPlayerCount() == 0) {
            // ИСПРАВЛЕНИЕ УТЕЧКИ ПАМЯТИ: Вызываем destroy() перед удалением
            console.log(`🗑️ Room ${socket.roomid} is empty (disconnect), destroying...`);
            room.destroy();
            io.emit("remove-room", { roomid: socket.roomid });
            games.delete(socket.roomid);
            console.log(`✅ Room ${socket.roomid} deleted and cleaned up`);
          }
        }
      }
    });
  });
};

module.exports = gameSocket;
