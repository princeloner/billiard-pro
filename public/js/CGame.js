// const { CANVAS_WIDTH, CANVAS_HEIGHT } = require("../../controllers/setting");

function CGame(playerId) {
  var _bUpdate = false;
  var _bSuitAssigned;
  var _iCurTurn; //Current Turn in game
  var _iWinStreak;
  var _aSuitePlayer;

  var _oScenario;
  var _oGameOverPanel;
  var _oPlayer1;
  var _oPlayer2;
  var _oScoreGUI;
  var _oInterface;
  var _oTable;
  var _oContainerGame;
  var _oContainerTable;
  var _oContainerInterface;
  var _iScore;

  var _oInteractiveHelp;

  var _oContainerInputController;
  // var _oInputController;
  var _oShotPowerBar;
  var _oContainerShotPowerBar;
  var _oCointainerShotPowerBarInput;
  var _bHoldStickCommand;
  var _iDirStickCommand;
  var _iDirStickSpeedCommand;
  var _messagebar;
  var _domElement;

  // Таймер хода - ЗАКОММЕНТИРОВАНО
  // var _iTurnTimerInterval;
  // var _bTurnTimerEnabled = false;

  this._init = function () {
    _iCurTurn = 1;
    _iWinStreak = 0;
    _bSuitAssigned = false;
    _bHoldStickCommand = false;
    _iDirStickCommand = 1;
    _iDirStickSpeedCommand = COMMAND_STICK_START_SPEED;

    _iScore = 0;

    switch (s_iGameMode) {
      case GAME_MODE_NINE: {
        BALL_NUMBER = 9;
        break;
      }
      case GAME_MODE_EIGHT: {
        BALL_NUMBER = 15;
        break;
      }
      case GAME_MODE_TIME: {
        BALL_NUMBER = 15;
        break;
      }
    }

    RACK_POS = STARTING_RACK_POS[s_iGameMode];

    _oContainerGame = new createjs.Container();
    s_oStage.addChild(_oContainerGame);

    var oBg = createBitmap(s_oSpriteLibrary.getSprite("bg_game"));
    _oContainerGame.addChild(oBg);

    _oContainerTable = new createjs.Container();
    _oContainerGame.addChild(_oContainerTable);

    _oContainerInterface = new createjs.Container();
    s_oStage.addChild(_oContainerInterface);

    _oInterface = new CInterface(_oContainerInterface);
    _oScenario = new CScene();

    if (s_iPlayerMode == GAME_MODE_TWO) {
      _oTable = new CNTable(
        _oContainerTable,
        GAME_DIFFICULTY_PARAMS[s_iGameDifficulty],
        playerId
      );
    } else {
      _oTable = new CTable(
        _oContainerTable,
        GAME_DIFFICULTY_PARAMS[s_iGameDifficulty]
      );
    }
    _oTable.addEventListener(ON_LOST, this.gameOver, this);
    _oTable.addEventListener(ON_WON, this.showWinPanel, this);

    var iY = 40;

    _oScoreGUI = null;

    _oPlayer1 = new CPlayerGUI(CANVAS_WIDTH / 2 - 400, iY, "YOU", s_oStage, 0);
    _oPlayer2 = new CPlayerGUI(
      CANVAS_WIDTH / 2 + 400,
      iY,
      s_iPlayerMode == GAME_MODE_TWO ? "OTHERS" : "CPU",
      s_oStage,
      1
    );
    // if (s_iPlayerMode === GAME_MODE_CPU) {
    _oScoreGUI = new CScoreGUI(CANVAS_WIDTH / 2, iY, s_oStage);
    // }

    if (_iCurTurn === 1) {
      _oPlayer1.highlight();
      _oPlayer2.unlight();
    } else {
      _oPlayer2.highlight();
      _oPlayer1.unlight();
    }

    if (s_iGameMode === GAME_MODE_NINE) {
      this.setNextBallToHit(1);
    }

    _oContainerInputController = new createjs.Container();
    s_oStage.addChild(_oContainerInputController);

    _oContainerShotPowerBar = new createjs.Container();
    s_oStageUpper3D.addChild(_oContainerShotPowerBar);

    _oCointainerShotPowerBarInput = new createjs.Container();
    s_oStage.addChild(_oCointainerShotPowerBarInput);

    if (s_bMobile) {
      _oShotPowerBar = new CShotPowerBar(
        _oContainerShotPowerBar,
        123,
        260,
        _oCointainerShotPowerBarInput
      );

      //_oShotPowerBar.hide(0);
    }

    var oFade = new createjs.Shape();
    oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    s_oStageUpper3D.addChild(oFade);

    tweenVolume("soundtrack", SOUNDTRACK_VOLUME_IN_GAME, 1000);

    _oGameOverPanel = new CGameOverPanel(s_oStageUpper3D);
    _oGameOverPanel.addEventListener(ON_EXIT_GAME, this.onExit, this);
    _oGameOverPanel.addEventListener(ON_RESTART, this.restartGame, this);

    _oNetGameOverPanel = new CNetGameOverPanel(s_oStageUpper3D);
    _oNetGameOverPanel.addEventListener(ON_EXIT_GAME, this.onNetExit, this);

    _oInteractiveHelp = null;

    s_bInteractiveHelp = localStorage.getItem("8ball_game_helped")
      ? false
      : true;

    if (s_bInteractiveHelp) {
      _oInteractiveHelp = new CInteractiveHelp(s_oStageUpper3D);
      _oInteractiveHelp.addEventListener(
        ON_END_TUTORIAL,
        this._onEndTutorial,
        this
      );
      $("#canvas_upper_3d").css("pointer-events", "initial");
      s_bInteractiveHelp = false;
    } else {
      this._onEndTutorial();
    }

    createjs.Tween.get(oFade)
      .to({ alpha: 0 }, 1000, createjs.Ease.cubicIn)
      .call(function () {
        s_oStageUpper3D.removeChild(oFade);
        s_oGame._startInteractiveHelp();
      });
    createjs.Tween.get(_oScenario)
      .wait(s_iTimeElaps)
      .call(_oScenario.update, null, _oScenario);

    if (s_iPlayerMode !== GAME_MODE_CPU) {
      function scaler() {
        var scalW =
          s_oStage.canvas.offsetWidth / document.documentElement.clientWidth;
        var scalH =
          s_oStage.canvas.offsetHeight / document.documentElement.clientHeight;
        var _spanScal = scalW < 1 ? scalW : scalH < 1 ? scalH : 1;
        _domElement.scaleX = _spanScal;
        _domElement.scaleY = _spanScal;
      }
    //   window.addEventListener("resize", scaler);
    //   _messagebar = document.querySelector(".message-wrapper");
    //   $(_messagebar).show();
    //   _domElement = new createjs.DOMElement(_messagebar);
    //   s_oStage.addChild(_domElement);
    //   document.addEventListener("keydown", this.onKeyDown);
    //   scaler();

      socket.on("send-message", this.onMessage);
    }
    this.refreshButtonPos();
    sizeHandler();
  };

  this.onMessage = function (msg) {
    if (_oTable.getSelfPid() == msg.pid) {
      $("#message_contant").append(
        `<p class='messa_self'> > ${msg.content} </p>`
      );
    } else {
      $("#message_contant").append(
        `<p class='message_other'> ${msg.content} < </p>`
      );
    }

    // divElement.scrollTop = divElement.scrollHeight;
    $("#message_contant").scrollTop($("#message_contant")[0].scrollHeight);
  };

  this.onKeyDown = function (e) {
    if (e.keyCode == 13) {
      var msg = $("#input_message").val();
      if (msg.length > 0) {
        $("#input_message").val("");
        socket.emit("send-message", msg);
        // $(".message_contant").addChild(`<p class='messa_self'> >${msg}< </p>`);
      }
    }
    $("#input_message").focus();
  };
  this._startInteractiveHelp = function () {
    if (!_oInteractiveHelp) {
      return;
    }

    if (s_bMobile) {
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_MOVE_STICK_MOBILE,
        info: {
          movement: false,
          on_show_tutorial: undefined,
        },
      });
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_SHOT_MOBILE,
        info: {
          movement: false,
          on_show_tutorial: undefined,
          param: _oShotPowerBar,
        },
      });
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_MOVE_STICK_BUTTONS,
        info: {
          movement: false,
          on_show_tutorial: undefined,
        },
      });
    } else {
      _oInteractiveHelp.startTutorial({
        tutorial: TUTORIAL_SHOT_DESKTOP,
        info: {
          movement: false,
          on_show_tutorial: undefined,
          param: _oShotPowerBar,
        },
      });
    }

    _oInteractiveHelp.startTutorial({
      tutorial: TUTORIAL_CUE_EFFECT,
      info: {
        movement: false,
        on_show_tutorial: undefined,
      },
    });

    _oInteractiveHelp.startTutorial({
      tutorial: TUTORIAL_RESPOT_CUE,
      info: {
        movement: false,
        on_show_tutorial: undefined,
      },
    });
  };

  this._onMouseDownPowerBar = function () {
    if (s_iPlayerMode !== GAME_MODE_CPU) {
      s_oTable._onMouseDownPowerBar();
    }
    s_oTable.startToShot();
  };

  this._onPressMovePowerBar = function (iOffset) {
    if (s_iPlayerMode !== GAME_MODE_CPU) {
      // s_oTable._onPressMoveHitArea();
    }
    s_oTable.holdShotStickMovement(iOffset);
  };

  this._onPressUpPowerBar = function () {
    if (s_iPlayerMode !== GAME_MODE_CPU) {
      s_oTable._onReleaseHitArea();
    }
    if (s_oTable.startStickAnimation()) {
      _oShotPowerBar.setInput(false);
    }
  };

  this.hideShotBar = function () {
    if (s_bMobile) {
      _oShotPowerBar.hide();
    }
  };

  this.showShotBar = function () {
    if (s_bMobile) {
      _oShotPowerBar.show();
    }
  };

  this._onEndTutorial = function () {
    $("#canvas_upper_3d").css("pointer-events", "none");
    _bUpdate = true;

    if (s_bMobile) {
      _oShotPowerBar.initEventListener();
      _oShotPowerBar.addEventListener(
        ON_MOUSE_DOWN_POWER_BAR,
        this._onMouseDownPowerBar,
        this
      );
      _oShotPowerBar.addEventListener(
        ON_PRESS_MOVE_POWER_BAR,
        this._onPressMovePowerBar,
        this
      );
      _oShotPowerBar.addEventListener(
        ON_PRESS_UP_POWER_BAR,
        this._onPressUpPowerBar,
        this
      );
      _oShotPowerBar.show();
    }

    if (_oInteractiveHelp) {
      _oInteractiveHelp.unload();
      _oInteractiveHelp = null;
      localStorage.setItem("8ball_game_helped", true);
    }
  };

  this._onPressDownStickCommand = function (iDir) {
    _iDirStickCommand = iDir;
    _bHoldStickCommand = true;
    _iDirStickSpeedCommand = COMMAND_STICK_START_SPEED;
  };

  this._onPressUpStickCommand = function () {
    _bHoldStickCommand = false;
  };

  this.unload = function (oCbCompleted = null, oCbScope) {
    _bUpdate = false;

    if (s_iPlayerMode !== GAME_MODE_CPU) {
      $(_messagebar).hide();
      document.removeEventListener("keydown", this.onKeyDown);
      socket.removeEventListener("send-message", this.onMessage);
    }

    var oFade = new createjs.Shape();
    oFade.graphics
      .beginFill("black")
      .drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    oFade.alpha = 0;
    s_oStageUpper3D.addChild(oFade);
    createjs.Tween.get(oFade)
      .to({ alpha: 1 }, 700, createjs.Ease.cubicIn)
      .call(function () {
        _oTable.unload();
        _oInterface.unload();
        _oScenario.unload();
        _oGameOverPanel.unload();
        _oNetGameOverPanel.unload();
        s_oStageUpper3D.removeAllChildren();
        s_oStage.removeAllChildren();
        if (oCbCompleted !== null) {
          oCbCompleted.call(oCbScope);
        }
      });
  };

  this.reset = function () {
    _iCurTurn = 1;
    _bSuitAssigned = false;
  };

  this.refreshButtonPos = function () {
    _oInterface.refreshButtonPos();
    _oPlayer1.refreshButtonPos();
    _oPlayer2.refreshButtonPos();

    _oCointainerShotPowerBarInput.x = _oContainerShotPowerBar.x =
      s_iOffsetX * 0.5;

    if (_oInteractiveHelp) {
      _oInteractiveHelp.refreshButtonsPos();
    }
    if (_oScoreGUI) {
      _oScoreGUI.refreshButtonPos();
    }
  };

  //set the lowest ball currently on the table in the player interface
  this.setNextBallToHit = function (iNextBall, curTurn) {
    if (curTurn) {
      if (_oTable.getSelfPid() == "player1") {
        if (curTurn === 1) {
          _oPlayer2.setBallVisible(false);
          _oPlayer1.setBall(iNextBall);
        } else {
          _oPlayer1.setBallVisible(false);
          _oPlayer2.setBall(iNextBall);
        }
      } else {
        if (curTurn === 1) {
          _oPlayer1.setBallVisible(false);
          _oPlayer2.setBall(iNextBall);
        } else {
          _oPlayer2.setBallVisible(false);
          _oPlayer1.setBall(iNextBall);
        }
      }
    } else {
      if (_iCurTurn === 1) {
        _oPlayer2.setBallVisible(false);
        _oPlayer1.setBall(iNextBall);
      } else {
        _oPlayer1.setBallVisible(false);
        _oPlayer2.setBall(iNextBall);
      }
    }
  };

  //change player turn
  this.changeTurn = function (bFault) {
    // Останавливаем таймер предыдущего игрока
    this.stopTurnTimer();

    if (_iCurTurn === 1) {
      _iCurTurn = 2;

      // Показываем панель управления только если это не CPU ход
      // В мультиплеере (CNTable) всегда показываем, в одиночной игре проверяем CPU
      if (s_iPlayerMode === GAME_MODE_TWO || !_oTable.isCpuTurn()) {
        s_oGame.showShotBar();
      }

      _oPlayer2.highlight();
      _oPlayer1.unlight();

      // Запускаем таймер для игрока 2 - ЗАКОММЕНТИРОВАНО
      /*
      if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
        _oPlayer2.startTimer(TURN_TIMER_DURATION);
        this.startTurnTimer();
      }
      */
    } else {
      _iCurTurn = 1;
      _oPlayer1.highlight();
      _oPlayer2.unlight();
      s_oGame.showShotBar();

      // Запускаем таймер для игрока 1 - ЗАКОММЕНТИРОВАНО
      /*
      if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
        _oPlayer1.startTimer(TURN_TIMER_DURATION);
        this.startTurnTimer();
      }
      */
    }
    s_oInterface.resetSpin();

    if (bFault) {
      new CEffectText(TEXT_FAULT, s_oStageUpper3D);
    } else {
      new CEffectText(TEXT_CHANGE_TURN, s_oStageUpper3D);
    }
  };

  this.netChangeTurn = function (pid, bFault) {
    console.log("🌐 Network turn change to player:", pid, "fault:", bFault);

    // Останавливаем таймер предыдущего игрока - ЗАКОММЕНТИРОВАНО
    // this.stopTurnTimer();

    // Обновляем _iCurTurn для синхронизации
    _iCurTurn = pid;

    if (pid === 1) {
      _oPlayer2.highlight();
      _oPlayer1.unlight();

      // Запускаем таймер для игрока 1 - ЗАКОММЕНТИРОВАНО
      /*
      if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
        _oPlayer1.startTimer(TURN_TIMER_DURATION);
        this.startTurnTimer();
      }
      */
    } else {
      _oPlayer1.highlight();
      _oPlayer2.unlight();

      // Запускаем таймер для игрока 2 - ЗАКОММЕНТИРОВАНО
      /*
      if (TURN_TIMER_ENABLED && s_iPlayerMode === GAME_MODE_TWO) {
        _oPlayer2.startTimer(TURN_TIMER_DURATION);
        this.startTurnTimer();
      }
      */
    }

    // Сбрасываем спин
    if (s_oInterface && s_oInterface.resetSpin) {
      s_oInterface.resetSpin();
    }

    // Показываем эффект смены хода
    if (bFault == 1) {
      new CEffectText(TEXT_FAULT, s_oStageUpper3D);
    } else {
      new CEffectText(TEXT_CHANGE_TURN, s_oStageUpper3D);
    }

    console.log("✅ Turn changed, current turn:", _iCurTurn);
  };

  this.assignSuits = function (iBallNumber) {
    _aSuitePlayer = new Array();
    if (iBallNumber < 8) {
      if (_iCurTurn === 1) {
        _aSuitePlayer[0] = "solid";
        _aSuitePlayer[1] = "stripes";
        this.setBallInInterface("solid");
      } else {
        _aSuitePlayer[0] = "stripes";
        _aSuitePlayer[1] = "solid";
        this.setBallInInterface("stripes");
      }
    } else {
      if (_iCurTurn === 1) {
        _aSuitePlayer[0] = "stripes";
        _aSuitePlayer[1] = "solid";
        this.setBallInInterface("stripes");
      } else {
        _aSuitePlayer[0] = "solid";
        _aSuitePlayer[1] = "stripes";
        this.setBallInInterface("solid");
      }
    }
    _bSuitAssigned = true;
  };

  this.setBallInInterface = function (szSuites1) {
    if (szSuites1 == "solid") {
      _oPlayer1.setBall(2);
      _oPlayer2.setBall(15);
    } else {
      _oPlayer1.setBall(15);
      _oPlayer2.setBall(2);
    }
  };

  this.setNetBallInInterface = function (szSuites1) {
    console.log(szSuites1, _oTable.getSelfPid());
    if (_oTable.getSelfPid() == "player1") {
      if (szSuites1 == "solid") {
        _oPlayer1.setBall(2);
        _oPlayer2.setBall(15);
      } else {
        _oPlayer1.setBall(15);
        _oPlayer2.setBall(2);
      }
    } else {
      if (szSuites1 == "solid") {
        _oPlayer1.setBall(15);
        _oPlayer2.setBall(2);
      } else {
        _oPlayer1.setBall(2);
        _oPlayer2.setBall(15);
      }
    }
  };

  this.isLegalShotFor8Ball = function (iBall, iNumBallToPot) {
    if (_bSuitAssigned) {
      if (_aSuitePlayer[_iCurTurn - 1] == "solid" && iBall < 8) {
        return true;
      } else {
        if (_aSuitePlayer[_iCurTurn - 1] == "stripes" && iBall > 8) {
          return true;
        } else if (iBall == 8 && iNumBallToPot == 0) {
          return true;
        } else {
          return false;
        }
      }
    } else {
      if (iBall != 8) {
        return true;
      } else {
        return false;
      }
    }
  };

  this.increaseWinStreak = function () {
    _iWinStreak++;
    //oWinStreak.text = "Win Streak: "+CAppBiliardo.m_iWinStreak;
  };

  this.resetWinStreak = function () {
    _iWinStreak = 0;
    //oWinStreak.text = "Win Streak: "+_iWinStreak;
  };

  this.gameOver = function (szText) {
    _oGameOverPanel.show(szText);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this._netgameOver = function (szText) {
    _oNetGameOverPanel.show(szText);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this._netshowWinPanel = function (szText) {
    var iScore = s_iGameMode === GAME_MODE_CPU ? _iScore : undefined;
    _oNetGameOverPanel.show(szText, iScore);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this.showWinPanel = function (szText) {
    var iScore = s_iGameMode === GAME_MODE_CPU ? _iScore : undefined;
    _oGameOverPanel.show(szText, iScore);
    $("#canvas_upper_3d").css("pointer-events", "initial");
    _bUpdate = false;
  };

  this.onExit = function () {
    _oScenario.update();
    tweenVolume("soundtrack", SOUNDTRACK_VOLUME_DEFAULT, 1000);
    this.unload(s_oMain.gotoMenu, s_oMain);
    $(s_oMain).trigger("show_interlevel_ad");
    $(s_oMain).trigger("end_session");
  };

  this.onNetExit = function () {
    _oScenario.update();
    tweenVolume("soundtrack", SOUNDTRACK_VOLUME_DEFAULT, 1000);
    this.unload(s_oMain.gotoMenu, s_oMain);
    $(s_oMain).trigger("show_interlevel_ad");
    $(s_oMain).trigger("end_session");
  };
  this.restartGame = function () {
    _oScenario.update();
    this.unload(s_oMain.gotoGame, s_oMain);

    $(s_oMain).trigger("show_interlevel_ad");
    $(s_oMain).trigger("end_session");
  };

  this.updateScore = function (iVal) {
    if (!_oScoreGUI) {
      return;
    }

    var iNewScore = _iScore + iVal;

    _iScore = iNewScore < 0 ? 0 : iNewScore;

    _oScoreGUI.refreshScore(_iScore);
    _oScoreGUI.highlight();
  };

  this.getCurTurn = function () {
    return _iCurTurn;
  };

  this.getTable = function () {
    return _oTable;
  };

  // Функция для тестирования таймера
  this.testTimer = function() {
    console.log("Testing timer...");
    if (_oPlayer1 && _oPlayer2) {
      var oCurrentPlayer = _iCurTurn === 1 ? _oPlayer1 : _oPlayer2;
      oCurrentPlayer.startTimer(5); // Тест на 5 секунд для быстрого тестирования
      this.startTurnTimer(); // Запускаем логику таймера
      console.log("Timer started for player " + _iCurTurn);
    }
  };

  // Функция для тестирования смены хода
  this.testChangeTurn = function() {
    console.log("🧪 Testing turn change...");
    console.log("Current turn:", _iCurTurn);
    if (s_iPlayerMode === GAME_MODE_TWO && _oTable && _oTable.socket) {
      // В мультиплеере
      this.onTurnTimeout();
    } else {
      // В локальной игре
      this.changeTurn(false);
    }
  };

  this.getNextTurn = function () {
    return _iCurTurn === 1 ? 2 : 1;
  };

  this.getSuiteForCurPlayer = function () {
    return _aSuitePlayer[_iCurTurn - 1];
  };

  this.isSuiteAssigned = function () {
    return _bSuitAssigned;
  };

  this.getPlayer1Name = function () {
    return _oPlayer1.getPlayerName();
  };

  this.getPlayer2Name = function () {
    return _oPlayer2.getPlayerName();
  };

  this._updateInput = function () {
    if (!_bHoldStickCommand) {
      return;
    }

    _oTable.rotateStick(_iDirStickCommand * _iDirStickSpeedCommand);
    _iDirStickSpeedCommand += COMMAND_STICK_SPEED_INCREMENT;

    if (_iDirStickSpeedCommand >= COMMAND_STICK_MAX_SPEED) {
      _iDirStickSpeedCommand = COMMAND_STICK_MAX_SPEED;
    }
  };

  this.update = function () {
    if (_bUpdate === false) {
      return;
    }

    this._updateInput();

    _oTable.update();
    _oScenario.update();
  };

  // Методы для управления таймером хода - ЗАКОММЕНТИРОВАНО
  /*
  this.startTurnTimer = function() {
    // Клиентский таймер отключен - сервер управляет всем
    // Сервер отправляет timer-update события, которые обрабатываются в CNTable
    console.log("⏱️ Client timer display mode (server-controlled)");
  };

  this.stopTurnTimer = function() {
    if (_iTurnTimerInterval) {
      clearInterval(_iTurnTimerInterval);
      _iTurnTimerInterval = null;
    }
    _bTurnTimerEnabled = false;

    // Останавливаем таймеры у игроков
    if (_oPlayer1) _oPlayer1.stopTimer();
    if (_oPlayer2) _oPlayer2.stopTimer();
  };

  this.onTurnTimeout = function() {
    console.log("🕐 Turn timeout for player " + _iCurTurn);

    // Клиент НЕ меняет ход сам - только сервер это делает
    // Сервер сам отследит таймаут и отправит событие changeTurn всем клиентам
    console.log("⏰ Waiting for server to change turn...");
  };

  this.updateTimerFromNetwork = function(data) {
    var oPlayer = data.playerId === 1 ? _oPlayer1 : _oPlayer2;
    if (oPlayer && oPlayer.isTimerActive()) {
      oPlayer.updateTimer();
    }
  };
  */

  s_oGame = this;

  this._init();
}

var s_oGame = null;

// Глобальные функции для тестирования
window.testTimer = function() {
  if (s_oGame && s_oGame.testTimer) {
    s_oGame.testTimer();
  } else {
    console.log("Game not ready or timer function not available");
  }
};

window.testChangeTurn = function() {
  if (s_oGame && s_oGame.testChangeTurn) {
    s_oGame.testChangeTurn();
  } else {
    console.log("Game not ready or turn change function not available");
  }
};

window.forceTurnChange = function() {
  if (s_oGame) {
    var oTable = s_oGame.getTable();
    console.log("🔄 Forcing turn change...");
    console.log("Table type:", oTable ? oTable.constructor.name : "none");
    console.log("Has changeTurn:", !!(oTable && oTable.changeTurn));

    if (oTable && oTable.changeTurn) {
      oTable.changeTurn(false);
    } else {
      s_oGame.changeTurn(false);
    }
  }
};

window.forceServerTurnChange = function() {
  if (s_oGame) {
    var oTable = s_oGame.getTable();
    console.log("🌐 Forcing server turn change...");
    if (oTable && oTable.socket) {
      oTable.socket.emit("turn-timeout", {
        playerId: s_oGame.getCurTurn()
      });
    } else {
      console.log("❌ No socket connection");
    }
  }
};

window.checkSocket = function() {
  console.log("🔍 Socket Check:");
  console.log("Global socket exists:", typeof socket !== 'undefined');
  if (typeof socket !== 'undefined') {
    console.log("Global socket connected:", socket.connected);
    console.log("Global socket ID:", socket.id);
  }

  if (s_oGame) {
    var oTable = s_oGame.getTable();
    if (oTable && oTable.constructor.name === 'CNTable') {
      console.log("CNTable socket exists:", !!oTable.socket);
      if (oTable.socket) {
        console.log("CNTable socket connected:", oTable.socket.connected);
      } else if (typeof socket !== 'undefined') {
        console.log("🔧 Fixing CNTable socket reference...");
        oTable.socket = socket;
        console.log("✅ CNTable socket fixed");
      }
    }
  }
};

window.testServerTimer = function() {
  console.log("🧪 Testing server-controlled timer...");
  console.log("📋 Instructions:");
  console.log("1. Server manages the timer completely");
  console.log("2. Client only displays timer updates from server");
  console.log("3. When time runs out, server automatically calls changeTurn()");
  console.log("4. Watch the console for server events:");
  console.log("   - timer-start");
  console.log("   - timer-update (every second)");
  console.log("   - timer-timeout");
  console.log("   - changeTurn");
  console.log("");
  console.log("✅ Timer is server-controlled. Just play the game and watch!");
};

window.showGameInfo = function() {
  if (s_oGame) {
    var oTable = s_oGame.getTable();
    console.log("🎮 Game Info:");
    console.log("Current turn (_iCurTurn):", s_oGame.getCurTurn());
    console.log("Player mode:", s_iPlayerMode === GAME_MODE_TWO ? "Multiplayer" : "Single/CPU");
    console.log("Timer enabled:", TURN_TIMER_ENABLED);
    console.log("Table type:", oTable ? oTable.constructor.name : "none");
    console.log("Table socket:", !!(oTable && oTable.socket));
    console.log("Global socket:", typeof socket !== 'undefined' ? !!socket : false);
    if (oTable && oTable.socket) {
      console.log("Socket connected:", oTable.socket.connected);
      console.log("Socket ID:", oTable.socket.id);
    }
  }
};
