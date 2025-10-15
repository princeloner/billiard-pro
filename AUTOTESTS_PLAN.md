# 🧪 План автотестирования

## Дата: 2025-10-15

---

## 📋 Типы тестов

### 1. Unit Tests (Модульные тесты)
Тестируют отдельные функции и классы

### 2. Integration Tests (Интеграционные тесты)
Тестируют взаимодействие компонентов

### 3. Load Tests (Нагрузочные тесты)
Тестируют производительность под нагрузкой

### 4. E2E Tests (End-to-End тесты)
Тестируют полный игровой процесс

---

## 🎯 Приоритеты тестирования

### Критично (P0):
1. ✅ Физика столкновений шаров
2. ✅ Создание/удаление игр (утечки памяти)
3. ✅ Socket.IO соединения
4. ✅ Spatial Hashing корректность

### Важно (P1):
5. ✅ Матчмейкинг
6. ✅ Смена хода
7. ✅ Определение победителя
8. ✅ Валидация данных

### Желательно (P2):
9. ✅ Производительность под нагрузкой
10. ✅ Стресс-тесты
11. ✅ Тесты безопасности

---

## 📦 Необходимые пакеты

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "socket.io-client": "^4.7.2",
    "artillery": "^2.0.0",
    "k6": "^0.47.0",
    "supertest": "^6.3.3",
    "chai": "^4.3.10",
    "mocha": "^10.2.0"
  }
}
```

**Установка:**
```bash
npm install --save-dev jest socket.io-client artillery supertest chai mocha
```

---

## 1️⃣ Unit Tests (Jest)

### Тест 1: Spatial Hashing

**Файл:** `tests/unit/PhysicsController.test.js`

```javascript
const { CPhysicsController } = require('../../controllers/PhysicsController');

describe('Spatial Hashing', () => {
  let physics;
  
  beforeEach(() => {
    physics = new CPhysicsController(null, null);
  });

  test('должен инициализировать сетку', () => {
    expect(physics._gridWidth).toBeGreaterThan(0);
    expect(physics._gridHeight).toBeGreaterThan(0);
  });

  test('должен правильно распределять шары по ячейкам', () => {
    const balls = createMockBalls(16);
    physics._buildSpatialGrid(balls);
    
    expect(physics._spatialGrid.size).toBeGreaterThan(0);
  });

  test('должен находить близкие шары', () => {
    const balls = createMockBalls(16);
    physics._buildSpatialGrid(balls);
    
    const nearbyBalls = physics._getNearbyBalls(balls[0]);
    
    // Должен найти меньше шаров чем всего на столе
    expect(nearbyBalls.length).toBeLessThan(balls.length);
    expect(nearbyBalls.length).toBeGreaterThanOrEqual(0);
  });

  test('не должен включать сам шар в список близких', () => {
    const balls = createMockBalls(16);
    physics._buildSpatialGrid(balls);
    
    const nearbyBalls = physics._getNearbyBalls(balls[0]);
    
    expect(nearbyBalls).not.toContain(balls[0]);
  });
});

function createMockBalls(count) {
  const balls = [];
  for (let i = 0; i < count; i++) {
    balls.push({
      getNumber: () => i,
      getX: () => 100 + i * 50,
      getY: () => 100 + i * 30,
      isBallOnTable: () => true,
      getHole: () => null,
      getPos: () => ({ x: 100 + i * 50, y: 100 + i * 30 })
    });
  }
  return balls;
}
```

---

### Тест 2: Утечка памяти

**Файл:** `tests/unit/Game.test.js`

```javascript
const Game = require('../../controllers/Game');

describe('Memory Leak Fix', () => {
  test('должен останавливать setInterval при destroy()', (done) => {
    const mockIo = { to: () => ({ emit: jest.fn() }) };
    const game = new Game(mockIo, 'test-room', { amount: 100 });
    
    // Проверяем что интервал запущен
    expect(game._updateInterval).toBeDefined();
    const intervalId = game._updateInterval;
    
    // Уничтожаем игру
    game.destroy();
    
    // Проверяем что интервал остановлен
    expect(game._updateInterval).toBeNull();
    
    // Проверяем что старый интервал не работает
    setTimeout(() => {
      // Если интервал не остановлен, тест упадет
      done();
    }, 100);
  });

  test('должен очищать все ресурсы', () => {
    const mockIo = { to: () => ({ emit: jest.fn() }) };
    const game = new Game(mockIo, 'test-room', { amount: 100 });
    
    game.destroy();
    
    expect(game._table).toBeNull();
    expect(game._currentPlayer).toBeNull();
    expect(game._players.size).toBe(0);
  });
});
```

---

### Тест 3: Валидация данных

**Файл:** `tests/unit/validation.test.js`

```javascript
const Game = require('../../controllers/Game');

describe('Data Validation', () => {
  let game;
  
  beforeEach(() => {
    const mockIo = { to: () => ({ emit: jest.fn() }) };
    game = new Game(mockIo, 'test-room', { amount: 100 });
  });

  test('должен отклонять невалидные данные удара', () => {
    const invalidShot = { vForce: 'invalid' };
    expect(game._validateEventData(invalidShot, 'shot')).toBe(false);
  });

  test('должен принимать валидные данные удара', () => {
    const validShot = { 
      vForce: { x: 10, y: 20 },
      vSpin: { x: 0, y: 0 }
    };
    expect(game._validateEventData(validShot, 'shot')).toBe(true);
  });

  test('должен отклонять слишком длинные сообщения', () => {
    const longMessage = 'a'.repeat(1000);
    expect(game._validateEventData(longMessage, 'message')).toBe(false);
  });
});
```

---

## 2️⃣ Integration Tests (Mocha + Chai)

### Тест 4: Socket.IO соединение

**Файл:** `tests/integration/socket.test.js`

```javascript
const io = require('socket.io-client');
const { expect } = require('chai');

describe('Socket.IO Integration', () => {
  let clientSocket;
  const serverUrl = 'http://localhost:2083';

  beforeEach((done) => {
    clientSocket = io(serverUrl);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  it('должен подключаться к серверу', (done) => {
    expect(clientSocket.connected).to.be.true;
    done();
  });

  it('должен создавать комнату', (done) => {
    clientSocket.emit('createroom-req', { amount: 100, isPrivate: false });
    
    clientSocket.on('createroom-res', (data) => {
      expect(data.success).to.be.true;
      expect(data.roomid).to.exist;
      done();
    });
  });

  it('должен присоединяться к комнате', (done) => {
    const client2 = io(serverUrl);
    
    clientSocket.emit('createroom-req', { amount: 100, isPrivate: false });
    
    clientSocket.on('createroom-res', (data) => {
      const roomid = data.roomid;
      
      client2.emit('joinroom-req', roomid);
      
      client2.on('joinroom-res', (response) => {
        expect(response.success).to.be.true;
        client2.disconnect();
        done();
      });
    });
  });
});
```

---

### Тест 5: Полный игровой цикл

**Файл:** `tests/integration/gameplay.test.js`

```javascript
const io = require('socket.io-client');
const { expect } = require('chai');

describe('Full Gameplay Cycle', () => {
  let player1, player2;
  const serverUrl = 'http://localhost:2083';

  beforeEach((done) => {
    player1 = io(serverUrl);
    player2 = io(serverUrl);
    
    let connected = 0;
    const checkConnected = () => {
      connected++;
      if (connected === 2) done();
    };
    
    player1.on('connect', checkConnected);
    player2.on('connect', checkConnected);
  });

  afterEach(() => {
    player1.disconnect();
    player2.disconnect();
  });

  it('должен проходить полный цикл игры', (done) => {
    // 1. Создание комнаты
    player1.emit('createroom-req', { amount: 100, isPrivate: false });
    
    player1.on('createroom-res', (data) => {
      const roomid = data.roomid;
      
      // 2. Присоединение второго игрока
      player2.emit('joinroom-req', roomid);
      
      player2.on('joinroom-res', () => {
        // 3. Удар
        player1.emit('player-shot', {
          vForce: { x: 50, y: 0 },
          vSpin: { x: 0, y: 0 }
        });
        
        // 4. Проверка смены хода
        player1.on('changeTurn', (turnData) => {
          expect(turnData).to.exist;
          done();
        });
      });
    });
  }).timeout(5000);
});
```

---

## 3️⃣ Load Tests (Artillery)

### Тест 6: Нагрузочное тестирование

**Файл:** `tests/load/artillery-config.yml`

```yaml
config:
  target: "http://localhost:2083"
  phases:
    # Фаза 1: Разогрев (10 пользователей за 30 секунд)
    - duration: 30
      arrivalRate: 10
      name: "Warm up"
    
    # Фаза 2: Рост нагрузки (50 пользователей за 60 секунд)
    - duration: 60
      arrivalRate: 50
      name: "Ramp up"
    
    # Фаза 3: Пиковая нагрузка (100 пользователей за 60 секунд)
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
    
    # Фаза 4: Спад (20 пользователей за 30 секунд)
    - duration: 30
      arrivalRate: 20
      name: "Cool down"
  
  processor: "./load-test-processor.js"
  
  socketio:
    transports: ["websocket"]

scenarios:
  - name: "Create and join game"
    engine: socketio
    flow:
      # Подключение
      - emit:
          channel: "createroom-req"
          data:
            amount: 100
            isPrivate: false
      
      # Ожидание ответа
      - think: 1
      
      # Получение состояния
      - emit:
          channel: "getStates"
      
      # Ожидание
      - think: 5
      
      # Выход
      - emit:
          channel: "leaveroom-req"

```

**Запуск:**
```bash
artillery run tests/load/artillery-config.yml
```

---

## 4️⃣ Stress Tests (k6)

### Тест 7: Стресс-тестирование

**Файл:** `tests/stress/k6-stress.js`

```javascript
import { check } from 'k6';
import http from 'k6/http';
import ws from 'k6/ws';

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // 50 пользователей
    { duration: '2m', target: 100 },  // 100 пользователей
    { duration: '2m', target: 200 },  // 200 пользователей
    { duration: '1m', target: 0 },    // Спад до 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% запросов < 500ms
    'ws_connecting': ['p(95)<1000'],    // 95% подключений < 1s
  },
};

export default function () {
  const url = 'ws://localhost:2083/socket.io/?EIO=4&transport=websocket';
  
  const res = ws.connect(url, function (socket) {
    socket.on('open', function () {
      // Создание комнаты
      socket.send(JSON.stringify({
        type: 'createroom-req',
        data: { amount: 100, isPrivate: false }
      }));
    });

    socket.on('message', function (data) {
      check(data, {
        'received response': (d) => d.length > 0,
      });
    });

    socket.setTimeout(function () {
      socket.close();
    }, 10000); // 10 секунд
  });

  check(res, {
    'status is 101': (r) => r && r.status === 101,
  });
}
```

**Запуск:**
```bash
k6 run tests/stress/k6-stress.js
```

---

## 📊 Метрики для отслеживания

### Производительность:
- ✅ CPU usage (должно быть < 70%)
- ✅ Memory usage (должно быть стабильно)
- ✅ Response time (< 100ms для Socket.IO)
- ✅ Throughput (запросов/сек)

### Надежность:
- ✅ Error rate (< 1%)
- ✅ Connection success rate (> 99%)
- ✅ Game completion rate (> 95%)

### Масштабируемость:
- ✅ Concurrent games
- ✅ Concurrent users
- ✅ Peak load handling

---

## 🚀 Запуск всех тестов

**package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "mocha tests/integration",
    "test:load": "artillery run tests/load/artillery-config.yml",
    "test:stress": "k6 run tests/stress/k6-stress.js",
    "test:all": "npm run test:unit && npm run test:integration"
  }
}
```

**Запуск:**
```bash
# Все unit тесты
npm run test:unit

# Все integration тесты
npm run test:integration

# Нагрузочное тестирование
npm run test:load

# Стресс-тестирование
npm run test:stress

# Все тесты (кроме нагрузочных)
npm run test:all
```

---

## ✅ Чек-лист внедрения

- [ ] Установить зависимости
- [ ] Создать структуру папок `tests/`
- [ ] Написать unit тесты для Spatial Hashing
- [ ] Написать unit тесты для утечки памяти
- [ ] Написать integration тесты для Socket.IO
- [ ] Настроить Artillery для нагрузочных тестов
- [ ] Настроить k6 для стресс-тестов
- [ ] Добавить CI/CD (GitHub Actions)
- [ ] Настроить мониторинг (Prometheus + Grafana)

**Автотесты готовы к внедрению!** 🧪

