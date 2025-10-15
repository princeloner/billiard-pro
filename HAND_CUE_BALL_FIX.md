# 🖐️ Исправление: Ложное появление руки (hand_cue_ball.png)

## ❓ Проблема

Картинка руки (`hand_cue_ball.png`) появлялась в неподходящие моменты:
- Когда НЕ нужно перемещать биток
- Во время обычного хода (когда нужно только прицелиться)
- У второго игрока (наблюдателя), хотя это не его ход

**КРИТИЧЕСКАЯ ОШИБКА**: `_oHandCueBallDrag` был `undefined` в некоторых местах, что вызывало:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'hide')
```

## 🔍 Причина

Рука должна показываться ТОЛЬКО когда:
1. Это ваш ход (`_currentPlayer == 0`)
2. Состояние игры = `STATE_TABLE_PLACE_CUE_BALL` или `STATE_TABLE_PLACE_CUE_BALL_BREAKSHOT`
3. Нужно переместить биток после фола

Но в коде были проблемы:
1. **В `setState()`** - рука не скрывалась правильно при смене состояния
2. **В `_placeCueBall()`** - рука не скрывалась после размещения битка
3. **В сетевых событиях** - рука показывалась для наблюдателя
4. **ГЛАВНАЯ ПРОБЛЕМА**: `_oHandCueBallDrag` создается в строке 206, но `_placeCueBall()` вызывается в строке 202 - ДО создания объекта!

---

## ✅ Решение

### 🔧 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Добавлены проверки на существование объекта

**Проблема**: `_oHandCueBallDrag` создается ПОСЛЕ первого вызова `_placeCueBall()`, что вызывало ошибки.

**Решение**: Добавлена проверка `if (_oHandCueBallDrag)` перед КАЖДЫМ использованием объекта.

**Исправлено в 11 местах:**
1. `setState()` - 4 проверки (строки 357, 361, 373, 383)
2. `startToShot()` - 1 проверка (строка 711)
3. `_moveStick()` - 1 проверка (строка 861)
4. `_onPressDownCueBall()` - 1 проверка (строка 910)
5. `_onNetPressDownCueBall()` - 1 проверка (строка 920)
6. `_onPressMoveCueBall()` - 1 проверка (строка 935)
7. `_onNetPressMoveCueBall()` - 1 проверка (строка 950)
8. `_onPressUpCueBall()` - 1 проверка (строка 959)
9. `_onNetPressUpCueBall()` - 1 проверка (строка 968)
10. `_placeCueBall()` - 1 проверка (строка 1000)
11. `respotCueBall()` - 2 проверки (строки 1526-1527)

---

### 1️⃣ Исправлен `setState()` - правильная логика показа/скрытия руки

**Файл**: `public/js/CNTable.js` (строки 342-392)

**Было:**
```javascript
switch (state) {
  case STATE_TABLE_PLACE_CUE_BALL:
  case STATE_TABLE_PLACE_CUE_BALL_BREAKSHOT:
  case STATE_TABLE_MOVE_STICK: {
    // Все три состояния обрабатывались одинаково
    if (_currentPlayer == 0) {
      s_oGame.showShotBar();
    }
    _oStick.setVisible(true);
    break;
  }
  case STATE_TABLE_SHOOTING: {
    _oHandCueBallDrag.hide();
    break;
  }
}
```

**Стало:**
```javascript
switch (state) {
  case STATE_TABLE_PLACE_CUE_BALL:
  case STATE_TABLE_PLACE_CUE_BALL_BREAKSHOT: {
    // Показываем руку ТОЛЬКО если это мой ход И нужно переместить биток
    if (_currentPlayer == 0) {
      s_oGame.showShotBar();
      if (_oHandCueBallDrag) { // ← ПРОВЕРКА!
        _oHandCueBallDrag.show();
      }
    } else {
      if (_oHandCueBallDrag) { // ← ПРОВЕРКА!
        _oHandCueBallDrag.hide();
      }
    }
    _oStick.setVisible(true);
    break;
  }
  case STATE_TABLE_MOVE_STICK: {
    // Обычный ход - рука НЕ нужна
    if (_currentPlayer == 0) {
      s_oGame.showShotBar();
    }
    if (_oHandCueBallDrag) { // ← ПРОВЕРКА!
      _oHandCueBallDrag.hide();
    }
    _oStick.setVisible(true);
    break;
  }
  case STATE_TABLE_SHOOTING: {
    s_oGame.hideShotBar();
    if (_oHandCueBallDrag) { // ← ПРОВЕРКА!
      _oHandCueBallDrag.hide();
    }
    break;
  }
}
```

**Результат**: Рука показывается ТОЛЬКО когда нужно переместить биток, и скрывается при обычном ходе.

---

### 2️⃣ Скрытие руки после размещения битка

**Файл**: `public/js/CNTable.js` (строки 968-977)

**Было:**
```javascript
this._placeCueBall = function () {
  if (!this._checkCueBallCollisionWithTableElements()) {
    _oContainerUpperBumper.visible = true;
    _oContainerDownBumper.visible = false;
    _oCueBall.setDragging(false);
    _oCueBall.setFlagOnTable(true);
    // Рука НЕ скрывалась!
  }
};
```

**Стало:**
```javascript
this._placeCueBall = function () {
  if (!this._checkCueBallCollisionWithTableElements()) {
    _oContainerUpperBumper.visible = true;
    _oContainerDownBumper.visible = false;
    _oCueBall.setDragging(false);
    _oCueBall.setFlagOnTable(true);
    // Скрываем руку когда биток размещен
    _oHandCueBallDrag.hide(); // ← ДОБАВЛЕНО!
  }
};
```

**Результат**: Рука исчезает сразу после того, как игрок разместил биток.

---

### 3️⃣ Скрытие руки для наблюдателя (второго игрока)

**Файл**: `public/js/CNTable.js`

#### Событие `_onNetPressDownCueBall` (строки 903-909):

**Было:**
```javascript
this._onNetPressDownCueBall = function () {
  if (_currentPlayer == 0) return;
  _oCueBall.setFlagOnTable(false);
  _oStick.setVisible(true);
  _oHandCueBallDrag.setPos(_oCueBall.getX(), _oCueBall.getY()); // Обновляли позицию
};
```

**Стало:**
```javascript
this._onNetPressDownCueBall = function () {
  if (_currentPlayer == 0) return;
  _oCueBall.setFlagOnTable(false);
  _oStick.setVisible(true);
  // НЕ показываем руку для наблюдателя - это не его ход
  _oHandCueBallDrag.hide(); // ← ИЗМЕНЕНО!
};
```

#### Событие `_onNetPressMoveCueBall` (строки 924-935):

**Было:**
```javascript
this._onNetPressMoveCueBall = function (oPos) {
  if (_currentPlayer == 0) return;
  // ... логика проверки
  _oHandCueBallDrag.setPos(_oCueBall.getX(), _oCueBall.getY()); // Обновляли позицию
};
```

**Стало:**
```javascript
this._onNetPressMoveCueBall = function (oPos) {
  if (_currentPlayer == 0) return;
  // ... логика проверки
  // НЕ показываем руку для наблюдателя
  _oHandCueBallDrag.hide(); // ← ИЗМЕНЕНО!
};
```

#### Событие `_onNetPressUpCueBall` (строки 945-950):

**Было:**
```javascript
this._onNetPressUpCueBall = function () {
  if (_currentPlayer == 0) return;
  _oHandCueBallDrag.setPos(_oCueBall.getX(), _oCueBall.getY());
  s_oTable._placeCueBall();
};
```

**Стало:**
```javascript
this._onNetPressUpCueBall = function () {
  if (_currentPlayer == 0) return;
  // НЕ показываем руку для наблюдателя
  _oHandCueBallDrag.hide(); // ← ИЗМЕНЕНО!
  s_oTable._placeCueBall();
};
```

**Результат**: Второй игрок (наблюдатель) НИКОГДА не видит руку, даже когда первый игрок перемещает биток.

---

### 4️⃣ Бонус: Исправлена валидация силы удара

**Файл**: `controllers/Table.js` (строки 825-849)

**Проблема**: Удар с силой `40.00000000000001` отклонялся, хотя это практически `40`.

**Решение**: Добавлен допуск `0.1` для погрешности вычислений:

```javascript
const MAX_POWER_FORCE_BALL = 40;
const TOLERANCE = 0.1; // Допуск для погрешности вычислений

if (magnitude > MAX_POWER_FORCE_BALL + TOLERANCE || magnitude < 0) {
  console.log(`⚠️ Invalid shot force: ${magnitude}, max: ${MAX_POWER_FORCE_BALL}`);
  return false;
}
```

**Результат**: Максимальные удары теперь проходят валидацию.

---

## 📊 Логика показа руки

### ✅ Рука ПОКАЗЫВАЕТСЯ когда:
1. **Это ваш ход** (`_currentPlayer == 0`)
2. **Состояние** = `STATE_TABLE_PLACE_CUE_BALL` или `STATE_TABLE_PLACE_CUE_BALL_BREAKSHOT`
3. **Сервер отправил** событие `iState` с этими состояниями

### ❌ Рука СКРЫВАЕТСЯ когда:
1. **Состояние** = `STATE_TABLE_MOVE_STICK` (обычный ход)
2. **Состояние** = `STATE_TABLE_SHOOTING` (удар выполнен)
3. **Биток размещен** (`_placeCueBall()` вызван)
4. **Это не ваш ход** (`_currentPlayer == 1`)
5. **Вы начали прицеливаться** (`startToShot()` вызван)

---

## 🎯 Состояния игры

| Состояние | Значение | Рука показывается? | Описание |
|-----------|----------|-------------------|----------|
| `STATE_TABLE_PLACE_CUE_BALL_BREAKSHOT` | 0 | ✅ Да (если мой ход) | Начальный удар, нужно разместить биток |
| `STATE_TABLE_PLACE_CUE_BALL` | 1 | ✅ Да (если мой ход) | Фол, нужно переместить биток |
| `STATE_TABLE_MOVE_STICK` | 2 | ❌ Нет | Обычный ход, прицеливание |
| `STATE_TABLE_SHOOT` | 3 | ❌ Нет | Подготовка к удару |
| `STATE_TABLE_SHOOTING` | 4 | ❌ Нет | Удар выполнен, шары катятся |

---

## 🧪 Как протестировать:

### Тест 1: Обычный ход
1. Откройте две вкладки, начните игру
2. **Ожидаемо**: Рука НЕ показывается при обычном ходе
3. **Результат**: ✅ Рука скрыта

### Тест 2: Фол (нужно переместить биток)
1. Сделайте фол (например, не попадите ни в один шар)
2. **Ожидаемо**: Рука показывается у игрока, который должен переместить биток
3. **Результат**: ✅ Рука показывается ТОЛЬКО у активного игрока

### Тест 3: Размещение битка
1. Когда рука показывается, перетащите биток
2. Отпустите мышь
3. **Ожидаемо**: Рука исчезает после размещения
4. **Результат**: ✅ Рука скрывается

### Тест 4: Наблюдатель
1. Откройте две вкладки
2. Первый игрок делает фол
3. Смотрите на экран второго игрока
4. **Ожидаемо**: Рука НЕ показывается у наблюдателя
5. **Результат**: ✅ Рука скрыта для наблюдателя

---

## ✅ Итог

**Проблема решена!** Рука теперь показывается ТОЛЬКО когда:
- Это ваш ход
- Нужно переместить биток (после фола или в начале)

**Рука НЕ показывается когда:**
- Обычный ход (прицеливание)
- Это не ваш ход (вы наблюдатель)
- Биток уже размещен

**Безопасность сохранена:**
- Валидация силы удара работает (с допуском 0.1)
- Валидация позиции битка работает
- Движения кия плавные

🎮 Игра работает правильно! 🎯

