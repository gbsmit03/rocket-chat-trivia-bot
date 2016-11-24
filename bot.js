'use strict';

var PlayerStore = require('./playerstore.js');
var Game = require('./game.js');
var QuestionStore = require('./questionstore.js');

var Bot = function Bot(ddpclient, rid) {
    console.log('stating game.');
    this.playerStore = new PlayerStore();
    this.questionStore = new QuestionStore();
    this.game = new (Game.bind(this));

    this.ddpclient = ddpclient;

    this.botSession = {
        rid: rid,
        currentPlayers: {},
        currentAnswers: {},
        currentCorrectAnswer: -1,
        roundScores: {},
        questions: [],
        acceptingAnswers: false,
        isRoundInProgress: false
    };

    this.ddpclient.on('message', this.doDppMessage.bind(this));

};

Bot.prototype.startBot = function startBot() {
    this.chatMessage('Trivia Bot Activated');
};

Bot.prototype.chatMessage = function chatMessage(message) {
    this.ddpclient.call(
        "sendMessage",
        [{ rid: this.botSession.rid, msg: message }],
        function (err, result) {
            if (err) {
                console.log('error', error);
            }
        }
    );
};

Bot.prototype.doDppMessage = function doDppMessage(ddpMsgStr) {
    var ddpMsg = JSON.parse(ddpMsgStr);
    //TODO ingore msgs from botSession
    if (Bot.isChatMessage(ddpMsg, this.botSession.rid)) {
        var message = ddpMsg.fields.args[0];
        console.log('ddpMsg ', ddpMsg);
        if (message.msg.substring(0, 3) === 'rct') {
            this.doBotCommand(message);
        } else if (this.botSession.acceptingAnswers) {
            var currentUser = message.u;
            if (this.botSession.currentPlayers[currentUser._id]) {
                this.botSession.currentAnswers[currentUser._id] = parseInt(message.msg.substring(0, 1));
            }
        }
    }
    //   console.log("ddp message: " + ddpMsgStr);
};

Bot.isChatMessage = function isChatMessage(ddpMsg, rid) {
    return ddpMsg.msg === 'changed' && ddpMsg.collection === 'stream-room-messages' && ddpMsg.fields.args[0].rid === rid && typeof ddpMsg.fields.args[0].editedAt === 'undefined';
};

Bot.prototype.doBotCommand = function doBotCommand(message) {
    var command = message.msg.substring(4).toLowerCase().trim(),
        botCommands = botCommands = {

            join: function join(user) {
                var self = this;
                console.log(user.username + ' is joining the game');
                if (!this.botSession.currentPlayers[user._id]) {
                    self.playerStore.getPlayer(user).then(function (userData) {
                        console.log('in player get ', userData);
                        if (userData) {
                            self.chatMessage(user.username + ' (' + userData.history.correctAnswers + '/' + userData.history.questionsPlayed + ')  has joined the game');
                            return new Promise(function (resolve) { resolve(userData) });
                        }
                        self.chatMessage(user.username + ' welcome to trivia. You have been registered and joined the game. Please type `rct help` for help.');
                        return self.playerStore.createPlayer(user);
                    })
                    .then(function (userData) {
                        self.botSession.currentPlayers[user._id] = user;
                    })
                    .catch(function (error) {
                        console.log('Error joining player ', user, error);
                    });
                }
                else {
                    this.chatMessage(user.username + ' you are already in the game.');
                }
            },

        leave: function leave(user) {
            console.log(user.username + ' is leaving the game');
            var currentPlayer = this.botSession.currentPlayers[user._id];
            if (currentPlayer) {
                this.playerStore.updatePlayer(currentPlayer);
                //TODO may want to handle this a new way
                delete this.botSession.currentPlayers[user._id]; //remove from game session 
                this.chatMessage('Goodbye ' + user.username + ' and thanks for playing.');
            } else {
                this.chatMessage(user.username + ' you can not leave a game that you are not in.');
            }
        },

        start: function start(user) {
            if(this.botSession.isRoundInProgress) {
                this.chatMessage('Round is already in progress ' + user.username);
            } else if (Object.keys(this.botSession.currentPlayers).length === 0) {
                this.chatMessage('There are no players in the game. Please type `rct join` to joing the game.');
            } else {
                this.botSession.isRoundInProgress = true;
                this.chatMessage(user.username + ' has started the round.');
                this.game.start();

               // gameLoop();
            }
        },

        help: function help() {
            //TODO print help
            this.chatMessage('`//TODO print help` lololololol');
        }
    };

    if (typeof botCommands[command] !== 'undefined') {
        botCommands[command].call(this, message.u);
    } else {
        this.chatMessage(message.u.username + '`' + message.msg + '` is an invalid command. Please type `rct help` for help');
    }
};

module.exports = Bot;