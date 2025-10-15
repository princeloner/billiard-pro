# ⏸️ Таймер временно отключен

## Дата: 2025-10-15

## Причина
Пользователь попросил временно закомментировать весь код, связанный с таймером, чтобы проверить основную логику игры без влияния таймера.

## Закомментированные файлы

### 1. controllers/Game.js (Сервер)

**Строки 22-25:** Переменные таймера
```javascript
// var _turnTimer;
// var _turnTimeLeft = 0;
// var _turnTimerEnabled = false;
```

**Строки 120-121, 138-139:** Вызовы методов таймера в `changeTurn()`
```javascript
// this.stopTurnTimer();
// this.startTurnTimer();
```

**Строки 365-366:** Запуск таймера при старте игры
```javascript
// this.startTurnTimer();
```

**Строки 450-523:** Все методы управления таймером
```javascript
/*
this.startTurnTimer = function() { ... }
this.stopTurnTimer = function() { ... }
this.getTurnTimeLeft = function() { ... }
this.isTurnTimerEnabled = function() { ... }
*/
```

### 2. public/js/CGame.js (Клиент - основная логика)

**Строки 35-37:** Переменные таймера
```javascript
// var _iTurnTimerInterval;
// var _bTurnTimerEnabled = false;
```

**Строки 470-476:** Запуск таймера для игрока 2 в `changeTurn()`
```javascript
/*
if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
  _oPlayer2.startTimer(TURN_TIMER_DURATION);
  this.startTurnTimer();
}
*/
```

**Строки 483-489:** Запуск таймера для игрока 1 в `changeTurn()`
```javascript
/*
if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
  _oPlayer1.startTimer(TURN_TIMER_DURATION);
  this.startTurnTimer();
}
*/
```

**Строки 500-546:** Запуск таймера в `netChangeTurn()`
```javascript
// this.stopTurnTimer();
/*
if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
  _oPlayer1.startTimer(TURN_TIMER_DURATION);
  this.startTurnTimer();
}
*/
```

**Строки 775-809:** Все методы управления таймером
```javascript
/*
this.startTurnTimer = function() { ... }
this.stopTurnTimer = function() { ... }
this.onTurnTimeout = function() { ... }
this.updateTimerFromNetwork = function(data) { ... }
*/
```

### 3. public/js/CNTable.js (Клиент - сетевая таблица)

**Строки 275-282:** Регистрация обработчиков событий таймера
```javascript
/*
socket.addEventListener("timer-start", this.onTimerStart);
socket.addEventListener("timer-update", this.onTimerUpdate);
socket.addEventListener("timer-stop", this.onTimerStop);
socket.addEventListener("timer-timeout", this.onTimerTimeout);
socket.addEventListener("timer-sync", this.onTimerSync);
*/
```

**Строки 2039-2102:** Все обработчики событий таймера
```javascript
/*
this.onTimerStart = function(data) { ... }
this.onTimerUpdate = function(data) { ... }
this.onTimerStop = function() { ... }
this.onTimerTimeout = function(data) { ... }
this.onTimerSync = function(data) { ... }
*/
```

### 4. public/js/CPlayerGUI.js (Клиент - интерфейс игрока)

**Строки 11-14:** Переменные таймера
```javascript
// var _oTimerText;
// var _iTimeLeft = 0;
// var _bTimerActive = false;
```

**Строки 46-59:** Создание визуального элемента таймера
```javascript
/*
_oTimerText = new CTLText(_oContainer,
            40, 35, oSpriteBG.width, 30,
            24, "left", "#ffff00", FONT_GAME, 1,
            0, 0,
            "30s",
            true, true, false,
            false );
if (_oTimerText.getText()) {
    _oTimerText.getText().visible = false;
}
*/
```

**Строки 108-157:** Все методы управления таймером
```javascript
/*
this.startTimer = function(iSeconds) { ... }
this.stopTimer = function() { ... }
this.updateTimer = function() { ... }
this.decrementTimer = function() { ... }
this.getTimeLeft = function() { ... }
this.isTimerActive = function() { ... }
*/
```

## Файлы настроек (НЕ изменены)

Следующие файлы **НЕ были изменены**, так как они содержат только настройки:

- `public/js/settings.js` - TURN_TIMER_ENABLED, TURN_TIMER_DURATION, TURN_TIMER_WARNING
- `controllers/setting.js` - TURN_TIMER_ENABLED, TURN_TIMER_DURATION, TURN_TIMER_WARNING

## Как включить таймер обратно

Чтобы включить таймер обратно, нужно:

1. Раскомментировать все блоки кода, помеченные как `// ЗАКОММЕНТИРОВАНО` или `/* ... */`
2. Убрать комментарии `//` перед переменными
3. Убрать `/*` и `*/` вокруг блоков кода

## Что теперь работает

✅ Основная логика игры
✅ Смена хода вручную (при завершении удара)
✅ Сетевая синхронизация
✅ Визуальные эффекты смены хода
✅ Highlight/unlight игроков

## Что НЕ работает

❌ Автоматическая смена хода по таймеру
❌ Визуальное отображение таймера
❌ События таймера от сервера
❌ Предупреждение "TIME'S UP!"

## Тестирование

Теперь можно протестировать игру без таймера:

1. Перезапустите сервер
2. Откройте две вкладки браузера
3. Создайте мультиплеерную игру
4. Играйте - ход будет меняться только после завершения удара
5. Таймер не будет отображаться и не будет автоматически менять ход

## Примечания

- Все изменения обратимы
- Код сохранен в комментариях для быстрого восстановления
- Логика игры не нарушена
- Можно безопасно тестировать основную функциональность

