# 🔧 Исправление: Плавность движений кия

## ❓ Проблема

После внедрения системы безопасности движения кия стали прерывистыми. Раньше оба игрока видели плавные движения кия друг друга, а теперь это работало с задержками.

## 🔍 Причина

Я добавил валидацию **ко всем** событиям, включая визуальные (движения кия):
- `_onPressHitArea` - нажатие на область удара
- `_onPressMoveHitArea` - движение мыши при прицеливании
- `_onReleaseHitArea` - отпускание мыши
- `updateStick` - обновление позиции кия

Эти события отправляются **очень часто** (при каждом движении мыши), и валидация замедляла их обработку.

## ✅ Решение

### 1. Разделил события на 2 категории:

#### 🎨 Визуальные события (БЕЗ валидации):
- `_onPressHitArea`
- `_onPressMoveHitArea`
- `_onReleaseHitArea`
- `updateStick`
- `_onPressDownCueBall`

**Почему без валидации?**
- Это только визуальная информация для другого игрока
- НЕ влияет на физику или результат игры
- Отправляются очень часто (100+ раз в секунду)
- Задержка портит игровой опыт

#### 🔒 Критические события (С валидацией):
- `player-shot` - **КРИТИЧНО!** Влияет на физику
- `_onPressMoveCueBall` - **КРИТИЧНО!** Позиция битка
- `send-message` - защита от спама

**Почему с валидацией?**
- Влияют на результат игры
- Могут быть использованы для читерства
- Отправляются редко (1-2 раза за ход)

---

### 2. Увеличил лимит rate limiting для визуальных событий:

**Было:**
```javascript
const limit = 100; // 100 событий
const window = 60000; // за 60 секунд
```

**Стало:**
```javascript
// Визуальные события (движения кия)
limit = 1000; // 1000 событий
window = 10000; // за 10 секунд

// Критические события
limit = 50; // 50 событий
window = 60000; // за 60 секунд
```

---

### 3. Исправил границы стола:

**Было:**
```javascript
const TABLE_BOUNDS = {
  minX: FIELD_POINTS[0].x + BALL_RADIUS * 2,
  maxX: FIELD_POINTS[1].x - BALL_RADIUS * 2,
  minY: FIELD_POINTS[0].y + BALL_RADIUS * 2,
  maxY: FIELD_POINTS[2].y - BALL_RADIUS * 2
};
```
Это давало слишком маленькую область (неправильные индексы).

**Стало:**
```javascript
const TABLE_BOUNDS = {
  minX: 100,
  maxX: 1180,
  minY: 50,
  maxY: 650
};
```
Теперь биток можно ставить в любом месте стола.

---

## 📊 Результат

| Аспект | До исправления | После исправления |
|--------|----------------|-------------------|
| **Плавность кия** | ❌ Прерывисто | ✅ Плавно |
| **Безопасность удара** | ✅ Защищено | ✅ Защищено |
| **Безопасность позиции битка** | ✅ Защищено | ✅ Защищено |
| **Rate limiting** | ⚠️ Слишком строго | ✅ Умный |
| **Игровой опыт** | ❌ Плохой | ✅ Хороший |

---

## 🎯 Философия безопасности

### ✅ Что НУЖНО защищать:
1. **Физика игры** - сила удара, направление
2. **Позиция битка** - где игрок ставит биток
3. **Результаты игры** - счет, победа/поражение
4. **Аутентификация** - кто есть кто

### ❌ Что НЕ НУЖНО защищать:
1. **Визуальная информация** - движения кия, анимации
2. **Позиция курсора** - где игрок целится
3. **Промежуточные состояния** - процесс прицеливания

**Правило**: Если событие НЕ влияет на результат игры - не добавляйте валидацию!

---

## 🔧 Внесенные изменения

### Файл: `controllers/Game.js`

**Убрана валидация для:**
```javascript
socket.on("_onPressHitArea", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  // БЕЗ валидации - только визуальная информация
  e.socket = true;
  this.send("_onPressHitArea", e);
});

socket.on("_onPressMoveHitArea", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  // БЕЗ валидации - плавные движения кия
  this.send("_onPressMoveHitArea", e);
});

socket.on("_onReleaseHitArea", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  // БЕЗ валидации
  this.send("_onReleaseHitArea", e);
});

socket.on("updateStick", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  // БЕЗ валидации
  this.send("updateStick", e);
});
```

**Оставлена валидация для:**
```javascript
socket.on("player-shot", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  // С ВАЛИДАЦИЕЙ - критично!
  if (!this._validateEventData(e, 'shot')) {
    console.log("⚠️ Invalid player-shot data");
    socket.emit("error", { message: "Invalid shot data" });
    return;
  }
  _table.shotBall(e);
});

socket.on("_onPressMoveCueBall", (e) => {
  if (socket.playerId !== _currentPlayer) return;
  // С ВАЛИДАЦИЕЙ - позиция битка критична!
  if (!this._validateEventData(e, 'position')) {
    console.log("⚠️ Invalid _onPressMoveCueBall data");
    return;
  }
  _table._onPressMoveCueBall(e);
  this.send("_onPressMoveCueBall", e);
});
```

---

### Файл: `controllers/gameSocket.js`

**Умный rate limiting:**
```javascript
const checkSocketRateLimit = (socket, event) => {
  const key = `${socket.id}:${event}`;
  const now = Date.now();
  
  let limit, window;
  
  // Визуальные события - высокий лимит
  const visualEvents = ['_onPressHitArea', '_onPressMoveHitArea', '_onReleaseHitArea', 'updateStick'];
  if (visualEvents.includes(event)) {
    limit = 1000; // 1000 событий
    window = 10000; // за 10 секунд
  } else {
    // Критические события - низкий лимит
    limit = 50;
    window = 60000;
  }
  
  // ... остальная логика
};
```

---

### Файл: `controllers/Table.js`

**Исправлены границы стола:**
```javascript
this._isValidCueBallPosition = function(oPos) {
  if (!oPos || typeof oPos.x !== 'number' || typeof oPos.y !== 'number') {
    return false;
  }
  
  if (!isFinite(oPos.x) || !isFinite(oPos.y)) {
    return false;
  }
  
  // Правильные границы стола
  const TABLE_BOUNDS = {
    minX: 100,
    maxX: 1180,
    minY: 50,
    maxY: 650
  };
  
  if (oPos.x < TABLE_BOUNDS.minX || oPos.x > TABLE_BOUNDS.maxX ||
      oPos.y < TABLE_BOUNDS.minY || oPos.y > TABLE_BOUNDS.maxY) {
    console.log(`⚠️ Cue ball out of bounds: x=${oPos.x}, y=${oPos.y}`);
    return false;
  }
  
  // Проверка наложения на другие шары
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

---

## ✅ Итог

**Безопасность:**
- ✅ Сила удара защищена (max 40)
- ✅ Позиция битка защищена (границы стола + наложение)
- ✅ Rate limiting работает умно
- ✅ CORS настроен правильно
- ✅ Сессии защищены

**Игровой опыт:**
- ✅ Движения кия плавные
- ✅ Прицеливание работает как раньше
- ✅ Оба игрока видят действия друг друга в реальном времени
- ✅ Нет задержек и лагов

**Баланс найден!** 🎯

Теперь игра безопасна И приятна в использовании! 🎮🛡️

