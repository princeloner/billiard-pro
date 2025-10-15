# 🔒 Анализ безопасности проекта 8-Ball Pool

## 📊 Общая оценка: ⚠️ КРИТИЧЕСКИЕ УЯЗВИМОСТИ

---

## 🎮 1. ФИЗИКА ИГРЫ - ГДЕ ОБРАБАТЫВАЕТСЯ?

### ✅ ХОРОШО: Физика на сервере
- **Файл**: `controllers/PhysicsController.js` (841 строк)
- **Файл**: `controllers/Table.js` (1416 строк)
- Вся физика (столкновения, движение шаров, попадание в лузы) обрабатывается на **СЕРВЕРЕ**
- Клиент (`public/js/CPhysicsController.js`) - только для визуализации

### ⚠️ ПРОБЛЕМА: Клиент отправляет силу удара
```javascript
// controllers/Game.js:214-217
socket.on("player-shot", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  _table.shotBall(e);  // e содержит вектор силы от клиента!
});

// controllers/Table.js:776-781
this.shotBall = function (vStickDirection) {
  _oCueBall.addForce(new CVector2(vStickDirection.x, vStickDirection.y));
  // НЕТ ВАЛИДАЦИИ силы удара!
}
```

**УЯЗВИМОСТЬ**: Читер может отправить любую силу удара (например, x:99999, y:99999)

---

## 🚨 2. КРИТИЧЕСКИЕ УЯЗВИМОСТИ

### 🔴 КРИТИЧНО #1: Нет валидации силы удара
**Файл**: `controllers/Table.js:776`
```javascript
this.shotBall = function (vStickDirection) {
  // ПРОБЛЕМА: Принимаем любые значения от клиента
  _oCueBall.addForce(new CVector2(vStickDirection.x, vStickDirection.y));
}
```

**Эксплуатация**:
```javascript
// Читер может отправить:
socket.emit("player-shot", { x: 999999, y: 999999 });
```

**Решение**:
```javascript
this.shotBall = function (vStickDirection) {
  // Валидация
  const maxForce = MAX_POWER_FORCE_BALL; // из setting.js
  const magnitude = Math.sqrt(vStickDirection.x ** 2 + vStickDirection.y ** 2);
  
  if (magnitude > maxForce) {
    console.log(`⚠️ Invalid shot force: ${magnitude}, max: ${maxForce}`);
    return; // Отклоняем читерский удар
  }
  
  _oCueBall.addForce(new CVector2(vStickDirection.x, vStickDirection.y));
}
```

---

### 🔴 КРИТИЧНО #2: Нет валидации позиции битка
**Файл**: `controllers/Table.js:358-360`
```javascript
this._onPressMoveCueBall = function (oPos) {
  this._moveCueBall(oPos); // НЕТ ПРОВЕРКИ позиции!
};
```

**Эксплуатация**: Читер может поставить биток в любое место стола

**Решение**:
```javascript
this._onPressMoveCueBall = function (oPos) {
  // Проверяем, что биток в допустимой зоне
  if (!this._isValidCueBallPosition(oPos)) {
    console.log(`⚠️ Invalid cue ball position: ${oPos.x}, ${oPos.y}`);
    return;
  }
  this._moveCueBall(oPos);
};

this._isValidCueBallPosition = function(oPos) {
  // Проверка границ стола
  if (oPos.x < MIN_X || oPos.x > MAX_X || oPos.y < MIN_Y || oPos.y > MAX_Y) {
    return false;
  }
  // Проверка, что не накладывается на другие шары
  for (let ball of _aBalls) {
    if (ball.getNumber() !== 0 && ball.isBallOnTable()) {
      const dist = distance(oPos, ball.getPos());
      if (dist < BALL_DIAMETER) {
        return false;
      }
    }
  }
  return true;
};
```

---

### 🔴 КРИТИЧНО #3: Нет проверки очередности хода
**Файл**: `controllers/Game.js:180-222`
```javascript
socket.on("player-shot", (e) => {
  if (socket.playerId !== _currentPlayer) return; // ✅ ЕСТЬ проверка
  _table.shotBall(e);
});
```
**Статус**: ✅ Частично защищено, но можно улучшить

---

### 🔴 КРИТИЧНО #4: CORS открыт для всех
**Файл**: `server.js:23-27`
```javascript
app.use(cors({
  origin: "*",  // ⚠️ ОПАСНО! Любой сайт может делать запросы
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
```

**Решение**:
```javascript
const allowedOrigins = [
  'http://localhost:2083',
  'https://yourdomain.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));
```

---

### 🟡 СРЕДНЕ #5: Нет rate limiting
**Проблема**: Игрок может спамить запросами

**Решение**:
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// Для Socket.IO
const socketLimiter = new Map();
io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  const count = socketLimiter.get(ip) || 0;
  
  if (count > 10) {
    socket.disconnect();
    return;
  }
  
  socketLimiter.set(ip, count + 1);
  setTimeout(() => socketLimiter.delete(ip), 60000);
});
```

---

### 🟡 СРЕДНЕ #6: Нет валидации входных данных
**Файл**: `controllers/matchmaking.js:29-56`
```javascript
function handleJoinMatchmaking(socket, data, io, games) {
  // НЕТ ВАЛИДАЦИИ data!
  const playerData = {
    socketId: socket.id,
    socket: socket,
    timestamp: Date.now()
  };
}
```

**Решение**:
```javascript
function handleJoinMatchmaking(socket, data, io, games) {
  // Валидация
  if (!data || typeof data !== 'object') {
    socket.emit('match_error', { message: 'Invalid data' });
    return;
  }
  
  // Санитизация
  const playerData = {
    socketId: socket.id,
    socket: socket,
    timestamp: Date.now()
  };
  
  matchmakingQueue.set(socket.id, playerData);
}
```

---

### 🟡 СРЕДНЕ #7: Сессии не защищены
**Файл**: `server.js:33-38`
```javascript
const sessionMiddleware = session({
  secret: PRIVATE_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // ⚠️ Должно быть true для HTTPS
});
```

**Решение**:
```javascript
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false, // Не создавать сессию для каждого запроса
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true для HTTPS
    httpOnly: true, // Защита от XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    sameSite: 'strict' // Защита от CSRF
  }
});
```

---

### 🟢 НИЗКО #8: Нет логирования подозрительной активности
**Решение**: Добавить Winston или аналог
```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Использование
socket.on("player-shot", (e) => {
  const magnitude = Math.sqrt(e.x ** 2 + e.y ** 2);
  if (magnitude > MAX_POWER_FORCE_BALL) {
    logger.warn(`Suspicious shot from ${socket.id}: force=${magnitude}`);
  }
});
```

---

## 📋 ПРИОРИТЕТНЫЙ ПЛАН ИСПРАВЛЕНИЙ

### 🔥 Срочно (1-2 дня):
1. ✅ Добавить валидацию силы удара в `shotBall()`
2. ✅ Добавить валидацию позиции битка
3. ✅ Настроить CORS правильно
4. ✅ Добавить rate limiting

### 📅 Важно (1 неделя):
5. Добавить валидацию всех входных данных
6. Настроить безопасные сессии
7. Добавить логирование
8. Добавить мониторинг подозрительной активности

### 📌 Желательно (1 месяц):
9. Добавить античит систему
10. Шифрование трафика (HTTPS/WSS)
11. Аутентификация игроков
12. Защита от DDoS

---

## 🎯 ИТОГОВАЯ ОЦЕНКА

| Категория | Оценка | Комментарий |
|-----------|--------|-------------|
| **Физика** | ✅ 8/10 | На сервере, но нет валидации входных данных |
| **Аутентификация** | ⚠️ 4/10 | Базовая, нет защиты |
| **Авторизация** | ✅ 7/10 | Проверка очередности хода есть |
| **Валидация** | 🔴 2/10 | Почти отсутствует |
| **CORS** | 🔴 1/10 | Открыт для всех |
| **Rate Limiting** | 🔴 0/10 | Отсутствует |
| **Логирование** | 🟡 5/10 | Базовое console.log |

**ОБЩАЯ ОЦЕНКА: 4/10** ⚠️

Проект функционален, но имеет серьезные уязвимости безопасности!

