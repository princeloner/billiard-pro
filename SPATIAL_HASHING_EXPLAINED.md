# 🎯 Spatial Hashing - Подробное объяснение

## Дата: 2025-10-15

---

## 📚 Что такое Spatial Hashing?

**Spatial Hashing** (пространственное хеширование) - это техника оптимизации для обнаружения столкновений, которая разделяет игровое пространство на сетку ячеек.

### Простая аналогия:

Представьте библиотеку с 1000 книг:

**❌ Без оптимизации (текущий подход):**
- Ищете книгу "Война и мир"
- Проверяете ВСЕ 1000 книг одну за другой
- Время поиска: O(n) = 1000 проверок

**✅ С Spatial Hashing:**
- Книги разложены по полкам (А-Я)
- Ищете "Война и мир" → идете на полку "В"
- Проверяете только ~40 книг на этой полке
- Время поиска: O(1) = 40 проверок

**Ускорение: 1000 / 40 = 25 раз быстрее!**

---

## 🎱 Как это работает для бильярда?

### Текущая проблема:

**Файл:** `controllers/PhysicsController.js:414-434`

```javascript
this.collideBallWithBalls = function (oBall) {
  for (var i = 0; i < _aBalls.length; i++) {  // ❌ Проверяем ВСЕ шары!
    if (_aBalls[i].getNumber() !== oBall.getNumber() &&
        _aBalls[i].isBallOnTable() &&
        _aBalls[i].getHole() === null) {
      
      tmpDist = distance2(oBall.getPos(), _aBalls[i].getPos());
      
      if (tmpDist <= BALL_DIAMETER_QUADRO) {
        // Столкновение!
      }
    }
  }
};
```

**Проблема:**
- 16 шаров на столе
- Для каждого шара проверяем 15 других шаров
- **16 × 15 / 2 = 120 проверок** на каждый кадр
- **120 × 60 FPS = 7200 проверок в секунду**
- **7200 × 100 игр = 720,000 проверок в секунду!** 💥

### Решение: Spatial Hashing

**Идея:** Разделить стол на сетку ячеек

```
┌─────────┬─────────┬─────────┬─────────┐
│  (0,0)  │  (1,0)  │  (2,0)  │  (3,0)  │
│    🎱   │         │    🎱   │         │
├─────────┼─────────┼─────────┼─────────┤
│  (0,1)  │  (1,1)  │  (2,1)  │  (3,1)  │
│         │  🎱🎱   │         │    🎱   │
├─────────┼─────────┼─────────┼─────────┤
│  (0,2)  │  (1,2)  │  (2,2)  │  (3,2)  │
│    🎱   │         │    🎱   │         │
└─────────┴─────────┴─────────┴─────────┘
```

**Теперь:**
- Шар в ячейке (1,1) проверяет столкновения только с шарами в:
  - Той же ячейке (1,1)
  - Соседних ячейках (0,0), (1,0), (2,0), (0,1), (2,1), (0,2), (1,2), (2,2)
- **Вместо 15 проверок → 2-4 проверки!**

---

## 📊 Математика

### Текущий подход (Brute Force):

```
Сложность: O(n²)
n = 16 шаров
Проверок: 16 × 15 / 2 = 120
```

### Spatial Hashing:

```
Сложность: O(n)
n = 16 шаров
Размер ячейки = 2 × диаметр шара
Средних шаров в ячейке = 2-3
Проверок на шар = 2-3 × 9 ячеек = 18-27
Всего проверок = 16 × 3 / 2 = 24

Ускорение: 120 / 24 = 5x быстрее!
```

---

## 💻 Реализация для вашего проекта

### Шаг 1: Создание сетки

```javascript
// controllers/PhysicsController.js

// Добавить в начало функции
var _spatialGrid = null;
var _cellSize = BALL_DIAMETER * 2;  // Размер ячейки = 2 диаметра шара
var _gridWidth = 0;
var _gridHeight = 0;

this._initSpatialGrid = function() {
  // Размеры стола из FIELD_POINTS
  var minX = Infinity, maxX = -Infinity;
  var minY = Infinity, maxY = -Infinity;
  
  for (var i = 0; i < FIELD_POINTS.length; i++) {
    if (FIELD_POINTS[i].x < minX) minX = FIELD_POINTS[i].x;
    if (FIELD_POINTS[i].x > maxX) maxX = FIELD_POINTS[i].x;
    if (FIELD_POINTS[i].y < minY) minY = FIELD_POINTS[i].y;
    if (FIELD_POINTS[i].y > maxY) maxY = FIELD_POINTS[i].y;
  }
  
  _gridWidth = Math.ceil((maxX - minX) / _cellSize);
  _gridHeight = Math.ceil((maxY - minY) / _cellSize);
  
  console.log(`📐 Spatial grid: ${_gridWidth}x${_gridHeight} cells`);
};
```

### Шаг 2: Построение сетки каждый кадр

```javascript
this._buildSpatialGrid = function(aBalls) {
  _spatialGrid = new Map();
  
  for (var i = 0; i < aBalls.length; i++) {
    var ball = aBalls[i];
    
    // Пропускаем шары в лузах
    if (!ball.isBallOnTable() || ball.getHole() !== null) {
      continue;
    }
    
    // Вычисляем ячейку для шара
    var cellX = Math.floor(ball.getX() / _cellSize);
    var cellY = Math.floor(ball.getY() / _cellSize);
    var key = cellX + ',' + cellY;
    
    // Добавляем шар в ячейку
    if (!_spatialGrid.has(key)) {
      _spatialGrid.set(key, []);
    }
    _spatialGrid.get(key).push(ball);
  }
};
```

### Шаг 3: Получение соседних шаров

```javascript
this._getNearbyBalls = function(oBall) {
  var nearbyBalls = [];
  
  var cellX = Math.floor(oBall.getX() / _cellSize);
  var cellY = Math.floor(oBall.getY() / _cellSize);
  
  // Проверяем 9 ячеек: текущую + 8 соседних
  for (var dx = -1; dx <= 1; dx++) {
    for (var dy = -1; dy <= 1; dy++) {
      var key = (cellX + dx) + ',' + (cellY + dy);
      
      if (_spatialGrid.has(key)) {
        var cellBalls = _spatialGrid.get(key);
        for (var i = 0; i < cellBalls.length; i++) {
          if (cellBalls[i].getNumber() !== oBall.getNumber()) {
            nearbyBalls.push(cellBalls[i]);
          }
        }
      }
    }
  }
  
  return nearbyBalls;
};
```

### Шаг 4: Оптимизированная проверка столкновений

```javascript
// НОВАЯ ВЕРСИЯ с Spatial Hashing
this.collideBallWithBalls = function (oBall) {
  var aCollisions = new Array();
  var tmpDist, minDist = 10000;
  var iPos;
  
  // ✅ Получаем только близкие шары вместо всех!
  var nearbyBalls = this._getNearbyBalls(oBall);
  
  for (var i = 0; i < nearbyBalls.length; i++) {
    var otherBall = nearbyBalls[i];
    
    if (otherBall.isBallOnTable() && otherBall.getHole() === null) {
      tmpDist = distance2(oBall.getPos(), otherBall.getPos());
      
      if (tmpDist <= BALL_DIAMETER_QUADRO) {
        aCollisions.push({
          oBall: otherBall,
          iDist: tmpDist,
          index_ball: i,
        });
        if (minDist > tmpDist) {
          minDist = tmpDist;
          iPos = aCollisions.length - 1;
        }
      }
    }
  }
  
  // Остальной код без изменений...
  if (aCollisions.length === 0) {
    return false;
  }
  
  // ... (код обработки столкновения)
};
```

### Шаг 5: Обновление в главном цикле

```javascript
this.update = function (aBalls) {
  _aBalls = aBalls;
  _bAllBallsStopped = true;
  
  // ✅ Строим сетку один раз в начале кадра
  this._buildSpatialGrid(aBalls);
  
  // Остальной код без изменений...
  for (var i = 0; i < aBalls.length; i++) {
    // ... обработка шаров
  }
};
```

---

## ⚠️ Правильно ли это для бильярда?

### ✅ ДА, это правильно, потому что:

1. **Шары движутся медленно** - сетка обновляется каждый кадр
2. **Шары распределены по столу** - редко все в одной ячейке
3. **Размер стола фиксирован** - сетка не меняется
4. **16 шаров - идеальное количество** для Spatial Hashing

### ❌ НЕТ, если бы:

1. Шары телепортировались (нужен другой алгоритм)
2. Было 1000+ шаров (нужен Quadtree или BVH)
3. Стол динамически менял размер

### 📊 Для вашего случая:

| Критерий | Ваш проект | Подходит? |
|----------|------------|-----------|
| Количество объектов | 16 шаров | ✅ Идеально |
| Скорость движения | Медленная | ✅ Да |
| Размер области | Фиксированный | ✅ Да |
| Распределение | Равномерное | ✅ Да |

**Вывод: Spatial Hashing ИДЕАЛЬНО подходит для бильярда!**

---

## 📈 Ожидаемые результаты

### Производительность:

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| **Проверок столкновений** | 120 | 20-30 | **-75%** |
| **CPU на физику** | 100% | 25-40% | **-60-75%** |
| **Игр на сервере** | 100 | 250-400 | **+150-300%** |

### Память:

```
Сетка: Map с ~20-30 ключами
Каждая ячейка: массив из 1-3 шаров
Дополнительная память: ~1-2 KB на игру
```

**Практически не влияет на память!**

---

## 🚀 Альтернативы

### 1. Quadtree (Квадродерево)

**Когда использовать:**
- Много объектов (100+)
- Неравномерное распределение
- Динамический размер области

**Для бильярда:** Избыточно сложно

### 2. BVH (Bounding Volume Hierarchy)

**Когда использовать:**
- 3D игры
- Сложные формы объектов
- Ray tracing

**Для бильярда:** Избыточно сложно

### 3. Sweep and Prune

**Когда использовать:**
- Много объектов движутся в одном направлении
- 2D платформеры

**Для бильярда:** Менее эффективно чем Spatial Hashing

---

## ✅ Рекомендация

**ДА, внедряйте Spatial Hashing!**

**Причины:**
1. ✅ Простая реализация (~50 строк кода)
2. ✅ Огромный прирост производительности (60-75%)
3. ✅ Минимальное влияние на память
4. ✅ Идеально подходит для бильярда
5. ✅ Легко тестировать и отлаживать

**Порядок внедрения:**
1. Сначала - исправление утечки памяти ✅ (уже сделано)
2. Потом - Spatial Hashing (следующий шаг)
3. Затем - снижение FPS или адаптивный FPS

**Хотите, чтобы я внедрил Spatial Hashing прямо сейчас?**

