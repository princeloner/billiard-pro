const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { Player, Admin } = require('./models');
const gameSocket = require('./controllers/gameSocket');

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 2083;
const DBURL = process.env.DBURL || 'mongodb://127.0.0.1:27017/8ballgame';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '8ballpool';

// Middleware
// Список разрешенных доменов
const allowedOrigins = [
  'http://localhost:2083',
  'http://localhost:3000',
  'http://127.0.0.1:2083',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

// CORS конфигурация для разработки и продакшена
app.use(cors({
  origin: function(origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения, Postman)
    if (!origin) return callback(null, true);

    // В режиме разработки разрешаем все ngrok домены
    if (origin && origin.includes('.ngrok-free.dev')) {
      console.log(`✅ CORS allowed (ngrok): ${origin}`);
      return callback(null, true);
    }

    // Разрешаем локальные адреса с любым портом
    if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      console.log(`✅ CORS allowed (localhost): ${origin}`);
      return callback(null, true);
    }

    // Проверяем список разрешенных доменов
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed (whitelist): ${origin}`);
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // максимум 5 попыток входа
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Применить rate limiting
app.use('/api/', apiLimiter);

// Session middleware
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
    sameSite: 'strict' // Защита от CSRF
  },
  rolling: true // Обновлять время жизни при каждом запросе
});

app.use(sessionMiddleware);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO setup с поддержкой ngrok и локальных адресов
const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      // Разрешаем запросы без origin
      if (!origin) return callback(null, true);

      // Разрешаем ngrok домены
      if (origin.includes('.ngrok-free.dev')) {
        return callback(null, true);
      }

      // Разрешаем локальные адреса
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }

      // Проверяем whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Apply session middleware to Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Initialize game sockets
gameSocket(io);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.get('/api/players', async (req, res) => {
  try {
    const players = await Player.find({ status: true }).select('-__v');
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.post('/api/players', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    let player = await Player.findOne({ walletAddress });
    
    if (!player) {
      player = new Player({
        walletAddress,
        handmadeCookies: 0,
        binance: 0,
        equipment: { cursors: 0 },
        status: true
      });
      await player.save();
    }

    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Admin routes
app.post('/api/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.adminId = admin._id;
    res.json({ message: 'Login successful', admin: { username: admin.username } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// Initialize database and start server
async function initializeDatabase() {
  try {
    await mongoose.connect(DBURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Create default admin if not exists
    const adminCount = await Admin.countDocuments({});
    if (adminCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('administrator', salt);
      const admin = new Admin({ 
        username: 'administrator', 
        password: hash,
        roles: ['admin']
      });
      await admin.save();
      console.log('✅ Default admin created (username: administrator, password: administrator)');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  server.listen(PORT, () => {
    console.log(`🎱 8-Ball Pool Server`);
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🎯 Base URL: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  / - Main game interface');
    console.log('  GET  /health - Health check');
    console.log('  GET  /api/players - Get players');
    console.log('  POST /api/players - Create player');
    console.log('  POST /api/admin/login - Admin login');
    console.log('  POST /api/admin/logout - Admin logout');
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = { app, server, io };