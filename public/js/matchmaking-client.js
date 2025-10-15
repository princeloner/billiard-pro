/**
 * Client-side Redis Matchmaking System
 * Адаптированная версия для браузера
 */

class MatchmakingClient {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.isConnected = false;
        this.currentRoom = null;
        this.searching = false;
        this.eventHandlers = {};
        
        // Настройки
        this.config = {
            serverUrl: window.location.origin,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10
        };
        
        this.reconnectAttempts = 0;
    }
    
    /**
     * Инициализация клиента матчмейкинга
     */
    initialize() {
        this.generatePlayerId();
        this.setupEventHandlers(); // Сначала настраиваем обработчики
        this.connect(); // Потом подключаемся
    }
    
    /**
     * Генерация ID игрока
     */
    generatePlayerId() {
        if (!localStorage.getItem('playerId')) {
            this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('playerId', this.playerId);
        } else {
            this.playerId = localStorage.getItem('playerId');
        }
        console.log('Player ID:', this.playerId);
    }
    
    /**
     * Подключение к серверу
     */
    connect() {
        try {
            // Используем глобальный socket вместо создания нового
            if (typeof socket !== 'undefined') {
                console.log('✅ Using global socket connection');
                this.socket = socket;
                this.isConnected = socket.connected;
            } else {
                console.log('⚠️ Creating new socket connection');
                this.socket = io(this.config.serverUrl, {
                    transports: ['websocket', 'polling']
                });
            }

            // Если используем глобальный socket, он уже подключен
            if (this.socket.connected) {
                console.log('✅ Socket already connected, socket.id:', this.socket.id);
                this.isConnected = true;
                this.registerPlayer();
                this.emit('connected');
            } else {
                this.socket.on('connect', () => {
                    console.log('✅ Connected to matchmaking server, socket.id:', this.socket.id);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;

                    // Регистрируем игрока после подключения
                    this.registerPlayer();

                    this.emit('connected');
                });
            }

            this.socket.on('registered', (data) => {
                console.log('Player registered successfully:', data);
                this.emit('registered', data);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from matchmaking server');
                this.isConnected = false;
                this.emit('disconnected');
                this.attemptReconnect();
            });

            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
                this.emit('error', error);
            });

            // События матчмейкинга
            this.socket.on('match_found', (data) => {
                console.log('📥 MatchmakingClient received match_found:', data);
                this.currentRoom = data.roomId;
                this.searching = false;
                console.log('📤 MatchmakingClient emitting match_found to listeners');
                this.emit('match_found', data);
            });

            this.socket.on('match_timeout', () => {
                console.log('📥 MatchmakingClient received match_timeout');
                this.searching = false;
                this.emit('match_timeout');
            });

            this.socket.on('search_status', (status) => {
                console.log('📥 MatchmakingClient received search_status:', status);
                this.emit('search_status', status);
            });

            this.socket.on('match_error', (error) => {
                console.error('📥 MatchmakingClient received match_error:', error);
                this.searching = false;
                this.emit('match_error', error);
            });

        } catch (error) {
            console.error('Failed to connect:', error);
            this.attemptReconnect();
        }
    }
    
    /**
     * Регистрация игрока на сервере
     */
    registerPlayer() {
        if (!this.socket || !this.isConnected) {
            console.error('Cannot register: not connected');
            return;
        }
        
        const registrationData = {
            playerId: this.playerId,
            telegramId: null, // Можно добавить позже если нужно
            username: 'Player_' + (this.playerId ? this.playerId.substr(-4) : '0000') // Генерируем имя из ID
        };
        
        this.socket.emit('register', registrationData);
        console.log('Player registration sent:', registrationData);
    }
    
    /**
     * Попытка переподключения
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.connect();
            }, this.config.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed');
        }
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventHandlers() {
        // Настраиваем обработчики сразу при создании сокета
        // Они будут работать когда сокет подключится
    }
    
    /**
     * Начать поиск матча
     */
    startQuickMatch(gameMode = 'classic', skillLevel = 1000, region = 'global') {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return false;
        }

        if (this.searching) {
            console.log('Already searching for match');
            return false;
        }

        const matchData = {
            playerId: this.playerId,
            gameMode: gameMode,
            skillLevel: skillLevel,
            region: region,
            timestamp: Date.now()
        };

        console.log('🚀 Emitting join-matchmaking, socket.id:', this.socket.id, 'data:', matchData);
        this.socket.emit('join-matchmaking', matchData);
        this.searching = true;
        console.log('Started quick match search');

        return true;
    }
    
    /**
     * Отменить поиск матча
     */
    cancelQuickMatch() {
        if (!this.searching) {
            console.log('Not currently searching');
            return false;
        }

        this.socket.emit('leave-matchmaking', { playerId: this.playerId });
        this.searching = false;
        console.log('Cancelled quick match search');

        return true;
    }

    /**
     * Остановить матчмейкинг (алиас для cancelQuickMatch)
     */
    stopMatchmaking() {
        return this.cancelQuickMatch();
    }
    
    /**
     * Присоединиться к комнате
     */
    joinRoom(roomId, playerData = {}) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return false;
        }
        
        const joinData = {
            playerId: this.playerId,
            roomId: roomId,
            playerData: playerData
        };
        
        this.socket.emit('join_room', joinData);
        console.log('Attempting to join room:', roomId);
        
        return true;
    }
    
    /**
     * Покинуть комнату
     */
    leaveRoom() {
        if (!this.currentRoom) {
            console.log('Not in a room');
            return false;
        }
        
        const leaveData = {
            playerId: this.playerId,
            roomId: this.currentRoom.id
        };
        
        this.socket.emit('leave_room', leaveData);
        this.currentRoom = null;
        console.log('Left room');
        
        return true;
    }
    
    /**
     * Установить готовность
     */
    setReady(isReady) {
        if (!this.currentRoom) {
            console.log('Not in a room');
            return false;
        }
        
        const readyData = {
            playerId: this.playerId,
            roomId: this.currentRoom.id,
            isReady: isReady
        };
        
        this.socket.emit('set_ready', readyData);
        console.log('Set ready status:', isReady);
        
        return true;
    }
    
    /**
     * Отправить игровое действие
     */
    sendGameAction(action, data) {
        if (!this.currentRoom) {
            console.log('Not in a room');
            return false;
        }
        
        const actionData = {
            playerId: this.playerId,
            roomId: this.currentRoom.id,
            action: action,
            data: data,
            timestamp: Date.now()
        };
        
        this.socket.emit('game_action', actionData);
        return true;
    }
    
    /**
     * Получить статус матчмейкинга
     */
    getStatus() {
        return {
            connected: this.isConnected,
            searching: this.searching,
            currentRoom: this.currentRoom,
            playerId: this.playerId
        };
    }
    
    /**
     * Добавить обработчик события
     */
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }
    
    /**
     * Удалить обработчик события
     */
    off(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
        }
    }
    
    /**
     * Вызвать обработчики события
     */
    emit(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Error in event handler:', error);
                }
            });
        }
    }
    
    /**
     * Отключиться
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.searching = false;
            this.currentRoom = null;
        }
    }
}

// Глобальная функция для получения статуса
function getMatchmakingStatus() {
    return window.matchmakingClient ? window.matchmakingClient.getStatus() : null;
}

// Глобальная функция для отмены матчмейкинга
function cancelMatchmaking() {
    return window.matchmakingClient ? window.matchmakingClient.cancelQuickMatch() : false;
}

// Инициализация при загрузке страницы
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        console.log('Matchmaking client loaded');
        
        // Создаем глобальный экземпляр
        window.matchmakingClient = new MatchmakingClient();
        
        // Инициализируем при наличии Socket.IO
        if (typeof io !== 'undefined') {
            window.matchmakingClient.initialize();
        } else {
            console.error('Socket.IO not found');
        }
    });
}