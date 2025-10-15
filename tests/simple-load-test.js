/**
 * Простой нагрузочный тест для бильярда
 * 
 * Запуск: node tests/simple-load-test.js
 * 
 * Что тестирует:
 * - Создание множества игр
 * - Подключение игроков
 * - Утечки памяти
 * - Производительность
 */

const io = require('socket.io-client');

// Конфигурация
const SERVER_URL = 'http://localhost:2083';
const NUM_GAMES = 20; // Количество игр для создания
const GAME_DURATION = 10000; // Длительность каждой игры (мс)
const DELAY_BETWEEN_GAMES = 500; // Задержка между созданием игр (мс)

// Статистика
const stats = {
  gamesCreated: 0,
  gamesFailed: 0,
  playersConnected: 0,
  playersDisconnected: 0,
  errors: [],
  startTime: Date.now(),
  memorySnapshots: []
};

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStats() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const memUsage = process.memoryUsage();
  
  console.log('\n' + '='.repeat(60));
  log(`📊 Статистика (${elapsed}s)`, 'cyan');
  console.log('='.repeat(60));
  log(`✅ Игр создано: ${stats.gamesCreated}`, 'green');
  log(`❌ Игр провалено: ${stats.gamesFailed}`, 'red');
  log(`👥 Игроков подключено: ${stats.playersConnected}`, 'blue');
  log(`👋 Игроков отключено: ${stats.playersDisconnected}`, 'yellow');
  log(`💾 Память: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`, 'cyan');
  
  if (stats.errors.length > 0) {
    log(`\n⚠️ Ошибки (${stats.errors.length}):`, 'red');
    stats.errors.slice(0, 5).forEach(err => {
      console.log(`  - ${err}`);
    });
    if (stats.errors.length > 5) {
      console.log(`  ... и еще ${stats.errors.length - 5} ошибок`);
    }
  }
  console.log('='.repeat(60) + '\n');
}

function createGame(gameNumber) {
  return new Promise((resolve) => {
    log(`🎮 Создание игры #${gameNumber}...`, 'blue');
    
    const player1 = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    const player2 = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: false
    });
    
    let roomid = null;
    let gameStarted = false;
    
    // Таймаут для игры
    const gameTimeout = setTimeout(() => {
      if (!gameStarted) {
        stats.gamesFailed++;
        log(`❌ Игра #${gameNumber} не запустилась (timeout)`, 'red');
      }
      
      // Отключаем игроков
      player1.disconnect();
      player2.disconnect();
      resolve();
    }, GAME_DURATION);
    
    // Обработчики ошибок
    player1.on('connect_error', (err) => {
      stats.errors.push(`Game #${gameNumber} P1 connect error: ${err.message}`);
    });
    
    player2.on('connect_error', (err) => {
      stats.errors.push(`Game #${gameNumber} P2 connect error: ${err.message}`);
    });
    
    // Игрок 1 создает комнату
    player1.on('connect', () => {
      stats.playersConnected++;
      
      player1.emit('createroom-req', {
        amount: 100,
        isPrivate: false
      });
    });
    
    player1.on('createroom-res', (data) => {
      if (data.success) {
        roomid = data.roomid;
        stats.gamesCreated++;
        log(`✅ Игра #${gameNumber} создана (${roomid})`, 'green');
        
        // Игрок 2 присоединяется
        player2.emit('joinroom-req', roomid);
      } else {
        stats.gamesFailed++;
        stats.errors.push(`Game #${gameNumber} creation failed: ${data.msg}`);
        clearTimeout(gameTimeout);
        player1.disconnect();
        player2.disconnect();
        resolve();
      }
    });
    
    // Игрок 2 присоединяется
    player2.on('connect', () => {
      stats.playersConnected++;
    });
    
    player2.on('joinroom-res', (data) => {
      if (data.success) {
        gameStarted = true;
        log(`👥 Игрок 2 присоединился к игре #${gameNumber}`, 'green');
        
        // Делаем несколько ударов для симуляции игры
        setTimeout(() => {
          player1.emit('player-shot', {
            vForce: { x: 50, y: 0 },
            vSpin: { x: 0, y: 0 }
          });
        }, 1000);
        
        setTimeout(() => {
          player2.emit('player-shot', {
            vForce: { x: -50, y: 0 },
            vSpin: { x: 0, y: 0 }
          });
        }, 3000);
      } else {
        stats.errors.push(`Game #${gameNumber} join failed`);
      }
    });
    
    // Отслеживание отключений
    player1.on('disconnect', () => {
      stats.playersDisconnected++;
    });
    
    player2.on('disconnect', () => {
      stats.playersDisconnected++;
    });
  });
}

async function runLoadTest() {
  log('\n🚀 Запуск нагрузочного теста...', 'cyan');
  log(`📊 Параметры:`, 'yellow');
  log(`   - Сервер: ${SERVER_URL}`, 'yellow');
  log(`   - Количество игр: ${NUM_GAMES}`, 'yellow');
  log(`   - Длительность игры: ${GAME_DURATION}ms`, 'yellow');
  log(`   - Задержка между играми: ${DELAY_BETWEEN_GAMES}ms\n`, 'yellow');
  
  // Начальный снимок памяти
  stats.memorySnapshots.push({
    time: 0,
    memory: process.memoryUsage().heapUsed
  });
  
  // Периодический вывод статистики
  const statsInterval = setInterval(logStats, 5000);
  
  // Создаем игры последовательно с задержкой
  for (let i = 1; i <= NUM_GAMES; i++) {
    await createGame(i);
    
    // Снимок памяти
    stats.memorySnapshots.push({
      time: Date.now() - stats.startTime,
      memory: process.memoryUsage().heapUsed
    });
    
    // Задержка перед следующей игрой
    if (i < NUM_GAMES) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_GAMES));
    }
  }
  
  // Ждем завершения всех игр
  log('\n⏳ Ожидание завершения всех игр...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, GAME_DURATION + 2000));
  
  clearInterval(statsInterval);
  
  // Финальная статистика
  log('\n🏁 Тест завершен!', 'cyan');
  logStats();
  
  // Анализ утечек памяти
  analyzeMemoryLeaks();
  
  // Итоговый отчет
  printFinalReport();
}

function analyzeMemoryLeaks() {
  if (stats.memorySnapshots.length < 2) return;
  
  const firstSnapshot = stats.memorySnapshots[0];
  const lastSnapshot = stats.memorySnapshots[stats.memorySnapshots.length - 1];
  
  const memoryGrowth = lastSnapshot.memory - firstSnapshot.memory;
  const memoryGrowthMB = (memoryGrowth / 1024 / 1024).toFixed(2);
  const memoryGrowthPercent = ((memoryGrowth / firstSnapshot.memory) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  log('🔍 Анализ утечек памяти', 'cyan');
  console.log('='.repeat(60));
  log(`Начальная память: ${(firstSnapshot.memory / 1024 / 1024).toFixed(2)} MB`, 'blue');
  log(`Конечная память: ${(lastSnapshot.memory / 1024 / 1024).toFixed(2)} MB`, 'blue');
  log(`Рост памяти: ${memoryGrowthMB} MB (${memoryGrowthPercent}%)`, 
      memoryGrowth > 50 * 1024 * 1024 ? 'red' : 'green');
  
  if (memoryGrowth > 50 * 1024 * 1024) {
    log('\n⚠️ ВНИМАНИЕ: Обнаружена возможная утечка памяти!', 'red');
    log('   Память выросла более чем на 50 MB', 'red');
  } else {
    log('\n✅ Утечек памяти не обнаружено', 'green');
  }
  console.log('='.repeat(60) + '\n');
}

function printFinalReport() {
  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  const successRate = ((stats.gamesCreated / NUM_GAMES) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  log('📋 ФИНАЛЬНЫЙ ОТЧЕТ', 'cyan');
  console.log('='.repeat(60));
  log(`⏱️  Общее время: ${totalTime}s`, 'blue');
  log(`🎮 Игр создано: ${stats.gamesCreated}/${NUM_GAMES} (${successRate}%)`, 
      stats.gamesCreated === NUM_GAMES ? 'green' : 'yellow');
  log(`❌ Игр провалено: ${stats.gamesFailed}`, 
      stats.gamesFailed === 0 ? 'green' : 'red');
  log(`👥 Всего подключений: ${stats.playersConnected}`, 'blue');
  log(`👋 Всего отключений: ${stats.playersDisconnected}`, 'blue');
  log(`⚠️  Всего ошибок: ${stats.errors.length}`, 
      stats.errors.length === 0 ? 'green' : 'red');
  
  // Оценка производительности
  console.log('\n' + '-'.repeat(60));
  log('🎯 Оценка производительности:', 'cyan');
  
  if (successRate >= 95 && stats.errors.length < 5) {
    log('   ✅ ОТЛИЧНО - Сервер работает стабильно', 'green');
  } else if (successRate >= 80 && stats.errors.length < 20) {
    log('   ⚠️  ХОРОШО - Есть небольшие проблемы', 'yellow');
  } else {
    log('   ❌ ПЛОХО - Требуется оптимизация', 'red');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Запуск теста
runLoadTest().then(() => {
  log('✅ Тест завершен успешно', 'green');
  process.exit(0);
}).catch((err) => {
  log(`❌ Ошибка теста: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});

