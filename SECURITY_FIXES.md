# 🛡️ Конкретные исправления безопасности

## 1️⃣ Валидация силы удара

### Файл: `controllers/Table.js`

**Добавить перед функцией `shotBall`:**
```javascript
this._validateShotForce = function(vStickDirection) {
  if (!vStickDirection || typeof vStickDirection.x !== 'number' || typeof vStickDirection.y !== 'number') {
    return false;
  }
  
  const magnitude = Math.sqrt(vStickDirection.x ** 2 + vStickDirection.y ** 2);
  
  // MAX_POWER_FORCE_BALL определен в setting.js
  if (magnitude > MAX_POWER_FORCE_BALL || magnitude < 0) {
    console.log(`⚠️ Invalid shot force: ${magnitude}, max: ${MAX_POWER_FORCE_BALL}`);
    return false;
  }
  
  // Проверка на NaN и Infinity
  if (!isFinite(vStickDirection.x) || !isFinite(vStickDirection.y)) {
    console.log(`⚠️ Invalid shot values: x=${vStickDirection.x}, y=${vStickDirection.y}`);
    return false;
  }
  
  return true;
};
```

**Изменить функцию `shotBall`:**
```javascript
this.shotBall = function (vStickDirection) {
  // Валидация
  if (!this._validateShotForce(vStickDirection)) {
    console.log("⚠️ Shot rejected: invalid force");
    io.to(room.getRoomId()).emit("shot-rejected", { reason: "Invalid force" });
    return;
  }
  
  console.log("shot-ball");
  _oCueBall.addForce(new CVector2(vStickDirection.x, vStickDirection.y));
  _iState = STATE_TABLE_SHOOTING;
  io.to(room.getRoomId()).emit("iState", STATE_TABLE_SHOOTING);
};
```

---

## 2️⃣ Валидация позиции битка

### Файл: `controllers/Table.js`

**Добавить функцию валидации:**
```javascript
this._isValidCueBallPosition = function(oPos) {
  if (!oPos || typeof oPos.x !== 'number' || typeof oPos.y !== 'number') {
    return false;
  }
  
  // Проверка на NaN и Infinity
  if (!isFinite(oPos.x) || !isFinite(oPos.y)) {
    return false;
  }
  
  // Проверка границ стола (используйте реальные значения из вашей игры)
  const TABLE_BOUNDS = {
    minX: 100,
    maxX: 1380,
    minY: 100,
    maxY: 700
  };
  
  if (oPos.x < TABLE_BOUNDS.minX || oPos.x > TABLE_BOUNDS.maxX ||
      oPos.y < TABLE_BOUNDS.minY || oPos.y > TABLE_BOUNDS.maxY) {
    console.log(`⚠️ Cue ball out of bounds: x=${oPos.x}, y=${oPos.y}`);
    return false;
  }
  
  // Проверка, что не накладывается на другие шары
  for (let i = 0; i < _aBalls.length; i++) {
    const ball = _aBalls[i];
    if (ball.getNumber() !== 0 && ball.isBallOnTable()) {
      const dx = oPos.x - ball.getX();
      const dy = oPos.y - ball.getY();
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < BALL_DIAMETER) {
        console.log(`⚠️ Cue ball overlaps with ball ${ball.getNumber()}`);
        return false;
      }
    }
  }
  
  return true;
};
```

**Изменить функцию `_onPressMoveCueBall`:**
```javascript
this._onPressMoveCueBall = function (oPos) {
  if (!this._isValidCueBallPosition(oPos)) {
    console.log(`⚠️ Invalid cue ball position rejected`);
    return;
  }
  this._moveCueBall(oPos);
};
```

---

## 3️⃣ Настройка CORS

### Файл: `server.js`

**Заменить:**
```javascript
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
```

**На:**
```javascript
// Список разрешенных доменов
const allowedOrigins = [
  'http://localhost:2083',
  'http://localhost:3000',
  process.env.FRONTEND_URL // Добавьте в .env
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// То же для Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

---

## 4️⃣ Rate Limiting

### Установка:
```bash
npm install express-rate-limit
```

### Файл: `server.js`

**Добавить после импортов:**
```javascript
const rateLimit = require('express-rate-limit');

// Rate limiter для API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter для аутентификации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // максимум 5 попыток входа
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Применить
app.use('/api/', apiLimiter);
app.use('/api/admin/login', authLimiter);
```

**Для Socket.IO (добавить в `controllers/gameSocket.js`):**
```javascript
const socketRateLimiter = new Map();

const checkSocketRateLimit = (socket, event) => {
  const key = `${socket.id}:${event}`;
  const now = Date.now();
  const limit = 100; // 100 событий
  const window = 60000; // за 60 секунд
  
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

// Использование
io.on("connection", (socket) => {
  socket.on("player-shot", (e) => {
    if (!checkSocketRateLimit(socket, "player-shot")) {
      socket.emit("error", { message: "Too many requests" });
      return;
    }
    // ... остальной код
  });
});
```

---

## 5️⃣ Безопасные сессии

### Файл: `server.js`

**Заменить:**
```javascript
const sessionMiddleware = session({
  secret: PRIVATE_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
});
```

**На:**
```javascript
const crypto = require('crypto');

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false, // Не создавать сессию для каждого запроса
  name: 'sessionId', // Изменить имя cookie (по умолчанию connect.sid)
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true только для HTTPS
    httpOnly: true, // Защита от XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 часа
    sameSite: 'strict', // Защита от CSRF
    domain: process.env.COOKIE_DOMAIN // Добавьте в .env
  },
  rolling: true, // Обновлять время жизни при каждом запросе
  saveUninitialized: false
});
```

**Добавить в `.env`:**
```
SESSION_SECRET=your-super-secret-key-here-min-32-chars
COOKIE_DOMAIN=yourdomain.com
NODE_ENV=production
```

---

## 6️⃣ Валидация входных данных

### Установка:
```bash
npm install joi
```

### Файл: `controllers/Game.js`

**Добавить в начало:**
```javascript
const Joi = require('joi');

// Схемы валидации
const shotSchema = Joi.object({
  x: Joi.number().min(-1000).max(1000).required(),
  y: Joi.number().min(-1000).max(1000).required()
});

const positionSchema = Joi.object({
  x: Joi.number().min(0).max(2000).required(),
  y: Joi.number().min(0).max(1000).required()
});
```

**Использование:**
```javascript
socket.on("player-shot", (e) => {
  // Валидация
  const { error, value } = shotSchema.validate(e);
  if (error) {
    console.log(`⚠️ Invalid shot data: ${error.message}`);
    socket.emit("error", { message: "Invalid shot data" });
    return;
  }
  
  if (socket.playerId !== _currentPlayer) return;
  _table.shotBall(value);
});

socket.on("_onPressMoveCueBall", (e) => {
  const { error, value } = positionSchema.validate(e);
  if (error) {
    console.log(`⚠️ Invalid position data: ${error.message}`);
    return;
  }
  
  if (socket.playerId !== _currentPlayer) return;
  _table._onPressMoveCueBall(value);
  this.send("_onPressMoveCueBall", value);
});
```

---

## 7️⃣ Логирование

### Установка:
```bash
npm install winston
```

### Создать файл: `utils/logger.js`
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Использование в `controllers/Game.js`:
```javascript
const logger = require('../utils/logger');

socket.on("player-shot", (e) => {
  const magnitude = Math.sqrt(e.x ** 2 + e.y ** 2);
  
  if (magnitude > MAX_POWER_FORCE_BALL) {
    logger.warn('Suspicious shot attempt', {
      socketId: socket.id,
      playerId: socket.playerId,
      force: magnitude,
      maxAllowed: MAX_POWER_FORCE_BALL,
      ip: socket.handshake.address
    });
  }
  
  // ... остальной код
});
```

---

## 📋 Чеклист внедрения

- [ ] 1. Валидация силы удара
- [ ] 2. Валидация позиции битка
- [ ] 3. Настройка CORS
- [ ] 4. Rate Limiting
- [ ] 5. Безопасные сессии
- [ ] 6. Валидация входных данных (Joi)
- [ ] 7. Логирование (Winston)
- [ ] 8. Создать `.env` файл с секретами
- [ ] 9. Добавить `.env` в `.gitignore`
- [ ] 10. Тестирование всех изменений

## 🚀 Порядок внедрения

1. **День 1**: Пункты 1, 2 (валидация игровых действий)
2. **День 2**: Пункты 3, 4 (CORS и rate limiting)
3. **День 3**: Пункты 5, 6, 7 (сессии, валидация, логирование)
4. **День 4**: Тестирование и отладка

