# 8-Ball Pool Server Setup

## Overview
This is a Node.js server for the 8-Ball Pool multiplayer game with real-time Socket.IO communication and MongoDB database.

## Features
- 🎱 Real-time multiplayer 8-ball pool game
- 💰 Wallet integration with Web3
- 🏆 Room-based multiplayer system
- 📊 Admin panel for game management
- 💾 MongoDB database for user data
- 🌐 WebSocket communication
- 📱 Responsive HTML5 Canvas interface

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

2. **Configure environment variables:**
   Edit the `.env` file in the root directory:
   ```
   PRIVATE_KEY="8ballpool"
   DBURL="mongodb://127.0.0.1:27017/8ballgame"
   PORT=2083
   BASE_URL=""
   MIN_CLICK_TIME=100
   ```

   For MongoDB Atlas (cloud):
   ```
   DBURL="mongodb+srv://username:password@cluster.mongodb.net/8ballgame?retryWrites=true&w=majority"
   ```

3. **Start the server:**
   ```bash
   # Production mode
   npm start
   
   # Development mode (with auto-reload)
   npm run dev
   ```

## Default Admin Account
After first startup, a default admin account is created:
- **Username:** administrator
- **Password:** administrator

⚠️ **Important:** Change the admin password after first login!

## API Endpoints

### Game Endpoints
- `GET /` - Main game interface
- `GET /health` - Server health check

### Player API
- `GET /api/players` - Get all active players
- `POST /api/players` - Create new player
  ```json
  {
    "walletAddress": "0x..."
  }
  ```

### Admin API
- `POST /api/admin/login` - Admin login
  ```json
  {
    "username": "administrator",
    "password": "administrator"
  }
  ```
- `POST /api/admin/logout` - Admin logout

## Socket.IO Events

### Client → Server
- `createroom-req` - Create a new game room
- `joinroom-req` - Join an existing room
- `leaveroom-req` - Leave current room
- `getall-room` - Get list of available rooms
- `_onPressHitArea` - Player hit action
- `_onPressMoveHitArea` - Player move action
- `_onReleaseHitArea` - Player release action
- `_onPressDownCueBall` - Cue ball interaction

### Server → Client
- `createroom-res` - Room creation response
- `joinroom-res` - Room join response
- `leaveroom-res` - Room leave response
- `setall-room` - Available rooms list
- `add-room` - New room notification
- `remove-room` - Room removal notification
- `new-join` - New player joined notification
- `changeTurn` - Turn change notification
- `matchResult` - Game result

## Project Structure
```
├── server.js              # Main server file
├── config/                # Configuration files
│   ├── express.js        # Express setup
│   ├── mongoose.js       # MongoDB connection
│   └── sockets.js        # Socket.IO setup
├── controllers/           # Game logic controllers
│   ├── Game.js           # Main game controller
│   ├── gameSocket.js     # Socket event handlers
│   ├── Table.js          # Pool table logic
│   ├── Ball.js           # Ball physics
│   └── ...
├── models.js             # Database models
├── public/               # Frontend files
│   ├── index.html        # Main game interface
│   ├── js/               # JavaScript game files
│   ├── css/              # Styles
│   ├── sprites/          # Game graphics
│   └── sounds/           # Game audio
└── dist/                 # Built frontend files
```

## Development

### Building Frontend
```bash
npm run build
```

### Environment Variables
- `PRIVATE_KEY` - Session secret key
- `DBURL` - MongoDB connection string
- `PORT` - Server port (default: 2083)
- `BASE_URL` - Base URL for the application
- `MIN_CLICK_TIME` - Minimum time between clicks (ms)

### MongoDB Setup
1. **Local MongoDB:**
   ```bash
   # Install MongoDB
   brew install mongodb-community  # macOS
   # or
   sudo apt-get install mongodb   # Ubuntu
   
   # Start MongoDB
   brew services start mongodb-community  # macOS
   # or
   sudo systemctl start mongodb           # Ubuntu
   ```

2. **MongoDB Atlas (Cloud):**
   - Sign up at [mongodb.com](https://www.mongodb.com/)
   - Create a free cluster
   - Get connection string and update `.env`

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Change port in .env file
   PORT=3000
   ```

2. **MongoDB connection failed:**
   - Check MongoDB service is running
   - Verify connection string in `.env`
   - Check network/firewall settings

3. **Socket.IO connection issues:**
   - Check CORS settings in server
   - Verify client connection URL
   - Check firewall/proxy settings

4. **Build errors:**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

## Security Notes
- Change default admin credentials
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement rate limiting for API endpoints
- Validate all user inputs
- Use MongoDB connection with authentication

## Production Deployment
1. Use process manager (PM2): `pm2 start server.js`
2. Enable HTTPS with SSL certificates
3. Set up reverse proxy (Nginx)
4. Configure firewall rules
5. Monitor logs and performance
6. Set up database backups

## Support
For issues and questions, check:
- Server logs in console
- Browser developer tools
- MongoDB connection status
- Socket.IO connection status