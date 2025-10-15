const Game = require("./Game");

const matchmakingQueue = new Map();
const MATCHMAKING_TIMEOUT = 30000;

function setupMatchmaking(socket, io, games) {
  socket.on("register", (data) => {
    console.log(`📝 Player registered:`, data);
    socket.emit("registered", {
      playerId: socket.id,
      username: data.username || `Player_${socket.id.substr(0, 4)}`,
      success: true
    });
  });

  socket.on("join-matchmaking", (data) => {
    handleJoinMatchmaking(socket, data, io, games);
  });

  socket.on("leave-matchmaking", (data) => {
    handleLeaveMatchmaking(socket);
  });

  socket.on("disconnect", () => {
    handleLeaveMatchmaking(socket);
  });
}

function handleJoinMatchmaking(socket, data, io, games) {
  console.log(`🔍 Player ${socket.id} joined matchmaking`);

  if (matchmakingQueue.has(socket.id)) {
    return;
  }

  const playerData = {
    socketId: socket.id,
    socket: socket,
    timestamp: Date.now()
  };

  matchmakingQueue.set(socket.id, playerData);
  console.log(`✅ Queue size: ${matchmakingQueue.size}`);

  broadcastSearchStatus(io);
  tryMatchPlayers(io, games);

  const timeoutId = setTimeout(() => {
    if (matchmakingQueue.has(socket.id)) {
      console.log(`⏰ Timeout for ${socket.id}`);
      handleLeaveMatchmaking(socket);
      socket.emit("match_timeout");
    }
  }, MATCHMAKING_TIMEOUT);

  playerData.timeoutId = timeoutId;
}

function handleLeaveMatchmaking(socket) {
  const playerData = matchmakingQueue.get(socket.id);

  if (playerData) {
    if (playerData.timeoutId) {
      clearTimeout(playerData.timeoutId);
    }
    matchmakingQueue.delete(socket.id);
    console.log(`🚪 Left queue. Size: ${matchmakingQueue.size}`);
  }
}

function tryMatchPlayers(io, games) {
  if (matchmakingQueue.size < 2) {
    return;
  }

  const players = Array.from(matchmakingQueue.values());
  const player1 = players[0];
  const player2 = players[1];

  console.log(`✨ Match found! ${player1.socketId} vs ${player2.socketId}`);

  matchmakingQueue.delete(player1.socketId);
  matchmakingQueue.delete(player2.socketId);

  if (player1.timeoutId) clearTimeout(player1.timeoutId);
  if (player2.timeoutId) clearTimeout(player2.timeoutId);

  createMatch(player1, player2, io, games);
  broadcastSearchStatus(io);
}

function createMatch(player1, player2, io, games) {
  const roomId = player1.socketId;

  console.log(`🎮 Creating room: ${roomId}`);

  const coinToss = Math.random() < 0.5;

  const gameData = {
    amount: 0,
    isPrivate: true
  };

  // Создаем комнату только для первого игрока
  const game = new Game(io, roomId, gameData);
  games.set(roomId, game);

  // Первый игрок присоединяется к своей комнате
  game.joinroom(player1.socket);

  const matchData = {
    roomId: roomId,
    coinToss: {
      won: coinToss
    }
  };

  const player1Data = {
    ...matchData,
    coinToss: { won: coinToss }
  };

  const player2Data = {
    ...matchData,
    coinToss: { won: !coinToss }
  };

  console.log(`📤 Sending match_found to player1 (${player1.socketId}):`, player1Data);
  player1.socket.emit("match_found", player1Data);

  console.log(`📤 Sending match_found to player2 (${player2.socketId}):`, player2Data);
  player2.socket.emit("match_found", player2Data);

  console.log(`✅ Match created: ${roomId}`);
}

function broadcastSearchStatus(io) {
  const status = {
    queueSize: matchmakingQueue.size,
    timestamp: Date.now()
  };

  matchmakingQueue.forEach((player) => {
    player.socket.emit("search_status", status);
  });
}

module.exports = {
  setupMatchmaking
};

