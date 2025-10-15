#!/usr/bin/env node

/**
 * 8-Ball Pool Server Startup Script
 * This script handles server startup with better error handling and logging
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDependencies() {
  log('🔍 Checking dependencies...', 'cyan');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies || {});
  const devDependencies = Object.keys(packageJson.devDependencies || {});
  
  const allDeps = [...dependencies, ...devDependencies];
  const missing = [];
  
  allDeps.forEach(dep => {
    try {
      require.resolve(dep);
    } catch (error) {
      missing.push(dep);
    }
  });
  
  if (missing.length > 0) {
    log(`❌ Missing dependencies: ${missing.join(', ')}`, 'red');
    log('💡 Run: npm install', 'yellow');
    return false;
  }
  
  log('✅ All dependencies installed', 'green');
  return true;
}

function checkEnvironment() {
  log('🔧 Checking environment...', 'cyan');
  
  if (!fs.existsSync('.env')) {
    log('⚠️  .env file not found, using default configuration', 'yellow');
  }
  
  // Check if required environment variables are set
  const requiredEnvVars = ['PRIVATE_KEY', 'DBURL', 'PORT'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    log(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`, 'yellow');
    log('💡 Using default values', 'yellow');
  }
  
  log('✅ Environment check complete', 'green');
}

function checkMongoDB() {
  return new Promise((resolve) => {
    log('🗄️  Testing MongoDB connection...', 'cyan');
    
    const mongoose = require('mongoose');
    const dbUrl = process.env.DBURL || 'mongodb://127.0.0.1:27017/8ballgame';
    
    mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    })
    .then(() => {
      log('✅ MongoDB connected successfully', 'green');
      mongoose.connection.close();
      resolve(true);
    })
    .catch((error) => {
      log(`❌ MongoDB connection failed: ${error.message}`, 'red');
      log('💡 Make sure MongoDB is running or check your connection string', 'yellow');
      resolve(false);
    });
  });
}

async function startServer() {
  log('🎱 Starting 8-Ball Pool Server...', 'magenta');
  log('=====================================', 'magenta');
  
  // Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  checkEnvironment();
  
  // Test MongoDB connection
  const mongoConnected = await checkMongoDB();
  if (!mongoConnected) {
    log('⚠️  Continuing without MongoDB...', 'yellow');
  }
  
  log('🚀 Starting server...', 'cyan');
  
  // Start the server
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  server.on('error', (error) => {
    log(`❌ Failed to start server: ${error.message}`, 'red');
    process.exit(1);
  });
  
  server.on('exit', (code) => {
    if (code !== 0) {
      log(`❌ Server exited with code ${code}`, 'red');
    } else {
      log('✅ Server stopped gracefully', 'green');
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\n🛑 Received SIGINT, shutting down gracefully...', 'yellow');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    log('\n🛑 Received SIGTERM, shutting down gracefully...', 'yellow');
    server.kill('SIGTERM');
  });
}

// Main execution
if (require.main === module) {
  startServer().catch((error) => {
    log(`❌ Startup failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { checkDependencies, checkEnvironment, checkMongoDB };