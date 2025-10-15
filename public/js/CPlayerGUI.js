function CPlayerGUI(iX,iY,szName,oParentContainer){
    var _pStartPos;

    var _szName;
    var _oTextName;
    var _oBall;
    var _oHighlight;
    var _oContainer;
    var _oParentContainer = oParentContainer;

    // Таймер хода - ЗАКОММЕНТИРОВАНО
    // var _oTimerText;
    // var _iTimeLeft = 0;
    // var _bTimerActive = false;
    
    this._init = function(iX,iY,szName){
        
        _szName = szName;
        _pStartPos = {x:iX,y:iY};
        _oContainer = new createjs.Container();
        _oContainer.x = iX;
        _oContainer.y = iY;
        _oParentContainer.addChild(_oContainer);
        
        var oSpriteBG = s_oSpriteLibrary.getSprite("player_gui");
        var oBg = createBitmap(oSpriteBG);
        _oContainer.addChild(oBg);
        
         var oSpriteHighlight =s_oSpriteLibrary.getSprite("highlight_player");
         _oHighlight = createBitmap(oSpriteHighlight);
         _oHighlight.alpha = 0;
         _oHighlight.regX = oSpriteHighlight.width/2;
         _oHighlight.regY = oSpriteHighlight.height/2;
         _oHighlight.x = oSpriteBG.width/2;
         _oHighlight.y = oSpriteBG.height/2;
         _oContainer.addChild(_oHighlight);
        
        _oTextName = new CTLText(_oContainer,
                    40, 5, oSpriteBG.width, oSpriteBG.height-10,
                    30, "left", "#fff", FONT_GAME, 1,
                    0, 0,
                    _szName,
                    true, true, false,
                    false );

        // Добавляем текст таймера - ЗАКОММЕНТИРОВАНО
        /*
        _oTimerText = new CTLText(_oContainer,
                    40, 35, oSpriteBG.width, 30,
                    24, "left", "#ffff00", FONT_GAME, 1,
                    0, 0,
                    "30s",  // Начальный текст вместо пустой строки
                    true, true, false,
                    false );
        // Скрываем таймер после создания
        if (_oTimerText.getText()) {
            _oTimerText.getText().visible = false;
        }
        */
        
        var oData = {   
                        images: [s_oSpriteLibrary.getSprite("balls")], 
                        // width, height & registration point of each sprite
                        frames: {width: BALL_DIAMETER, height: BALL_DIAMETER, regX: BALL_DIAMETER/2, regY: BALL_DIAMETER/2}, 
                        animations: {ball_0:0,ball_1:1,ball_2:2,ball_3:3,ball_4:4,ball_5:5,ball_6:6,ball_7:7,ball_8:8,ball_9:9
                                    ,ball_10:10,ball_11:11,ball_12:12,ball_13:13,ball_14:14,ball_15:15}
                   };
                   
         var oSpriteSheet = new createjs.SpriteSheet(oData);
         _oBall = createSprite(oSpriteSheet,"ball_0",BALL_DIAMETER/2,BALL_DIAMETER/2,BALL_DIAMETER,BALL_DIAMETER);
         _oBall.x = oSpriteBG.width - BALL_DIAMETER - 20;
         _oBall.y = oSpriteBG.height/2;
         _oBall.visible = false;
         _oContainer.addChild(_oBall);
         
         //this.setBall(1);
         
         _oContainer.regX = oSpriteBG.width/2;
    };
    
    this.refreshButtonPos = function(){
        _oContainer.y = _pStartPos.y + s_iOffsetY * 0.5;
    };
    
    this.setBallVisible = function(bVisible){
        _oBall.visible = bVisible;
    };
    
    this.setBall = function(iBall){
        this.setBallVisible(true);
        _oBall.gotoAndStop("ball_"+iBall);
    };
    
    this.highlight = function(){
        _oHighlight.alpha = 0 ;
        createjs.Tween.get(_oHighlight, {loop:-1}).to({alpha:1}, 1000, createjs.Ease.cubicOut).to({alpha:0}, 1000, createjs.Ease.cubicIn);
    };
    
    this.unlight = function(){
        _oHighlight.alpha = 0 ;
        createjs.Tween.removeTweens(_oHighlight);
    };
    
    this.getPlayerName = function(){
        return _szName;
    };

    // Методы для управления таймером - ЗАКОММЕНТИРОВАНО
    /*
    this.startTimer = function(iSeconds) {
        _iTimeLeft = iSeconds;
        _bTimerActive = true;
        if (_oTimerText && _oTimerText.getText()) {
            _oTimerText.getText().visible = true;
        }
        this.updateTimer();
    };

    this.stopTimer = function() {
        _bTimerActive = false;
        if (_oTimerText && _oTimerText.getText()) {
            _oTimerText.getText().visible = false;
        }
    };

    this.updateTimer = function() {
        if (!_bTimerActive || !_oTimerText) return;

        var sTime = _iTimeLeft + "s";
        var iWarningTime = typeof TURN_TIMER_WARNING !== 'undefined' ? TURN_TIMER_WARNING : 10;
        var sColor = _iTimeLeft <= iWarningTime ? "#ff0000" : "#ffff00";

        _oTimerText.refreshText(sTime);
        _oTimerText.setColor(sColor);

        if (_iTimeLeft <= 0) {
            this.stopTimer();
        }
    };

    this.decrementTimer = function() {
        if (_bTimerActive && _iTimeLeft > 0) {
            _iTimeLeft--;
            this.updateTimer();
            return _iTimeLeft;
        }
        return -1;
    };

    this.getTimeLeft = function() {
        return _iTimeLeft;
    };

    this.isTimerActive = function() {
        return _bTimerActive;
    };
    */

    this._init(iX,iY,szName);
}