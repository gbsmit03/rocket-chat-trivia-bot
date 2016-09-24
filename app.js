"use strict";

var DDPClient = require('ddp'),
    Db = require('tingodb')().Db,
    rest = require('rest'),
    mime = require('rest/interceptor/mime'),
    errorCode = require('rest/interceptor/errorCode'),
    rctConfig = require('./config.js');

var client = rest.wrap(mime)
             .wrap(errorCode, { code: 500 });

var METHODS = {
    LOGIN: 'login',
    CHANNELSLIST: 'channelsList',
    STREAM_ROOM_MESSAGES: 'stream-room-messages'
};

var BOT_SESSION = {
    rid: '',
    currentPlayers: {},
    currentAnswers: {},
    currentCorrectAnswer: -1,
    roundScores: {},
    questions: [],
    acceptingAnswers: false,
    isRoundInProgress: false
}

console.log(__dirname);
var playerDb = new Db(__dirname + '/db', {});
var playerCollection = playerDb.collection('player_collection');

//END config stuff

var ddpclient = new DDPClient(rctConfig.DDP_CONFIG);

/*
 * Connect to the Meteor Server
 */
ddpclient.connect(function (error, wasReconnect) {
    // If autoReconnect is true, this callback will be invoked each time
    // a server connection is re-established
    if (error) {
        console.log("DDP connection error!");
        return;
    }

    if (wasReconnect) {
        console.log("Reestablishment of a connection.");
    }

    console.log("connected!");

    setTimeout(function () {
        ddpclient.call(
            METHODS.LOGIN,
            [rctConfig.LOGIN_OBJ],
            function (err, result) {

                console.log("login");

                ddpclient.call(
                    "channelsList",
                    [rctConfig.TRIVIA_BOT_CONFIG.CHATROOM, "all", 1, "name"],
                    function (err, result) {
                        if (!err) {
                            if (result.channels.length) {
                                BOT_SESSION.rid = result.channels[0]._id;
                                var roomSubId = ddpclient.subscribe(
                                    'stream-room-messages',
                                    [BOT_SESSION.rid, false],
                                    function () {
                                        console.log(' in room ' + rctConfig.TRIVIA_BOT_CONFIG.CHATROOM + '(' + BOT_SESSION.rid + ')');
                                        chatMessage('Trivia Bot Activated');
                                        RCT_COMMANDS.help();
                                    }
                                );
                            }
                        } else {
                            console.log('error', error);
                        }
                    }
                );
            }
        );
    }, 3000);

    var getRandomIntInclusive = function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var doRandomAnswers = function doRandomAnswers(question) {
        var randomList = [],
            unRandomList = question.incorrect_answers,
            correctAnswer = question.correct_answer;
            unRandomList.push(correctAnswer);

        while(unRandomList.length > 0){
            var randomIndex = getRandomIntInclusive(0, unRandomList.length-1);
            randomList.push(unRandomList.splice(randomIndex, 1)[0]);
            console.log('randomList[randomList.length-1] ', randomList[randomList.length-1]);
            console.log('correctAnswer ', correctAnswer);
            if(randomList[randomList.length-1] === correctAnswer) {
                console.log('hit bro hit');
                BOT_SESSION.currentCorrectAnswer = randomList.length;
            }
        }
        return randomList;
    };

    var doQuestion = function doQuestion() {
        var currentQuestion = BOT_SESSION.questions[0],
            answers = doRandomAnswers(currentQuestion);
            
            chatMessage('Question number *'+ (6-BOT_SESSION.questions.length) +'* \n' + 'Category: ' + currentQuestion.category + '      Difficulty: ' + currentQuestion.difficulty + '\n' +
                currentQuestion.question + '\n' +
                '1) ' + answers[0] + '\n' +
                '2) ' + answers[1] + '\n' +
                '3) ' + answers[2] + '\n' +
                '4) ' + answers[3]);
                BOT_SESSION.acceptingAnswers = true;
            //TODO fix encoding issues

        setTimeout(function () {
            chatMessage('time is up.');
            BOT_SESSION.acceptingAnswers = false;
            var playerAnswers = BOT_SESSION.currentAnswers;
            for (var playerId in playerAnswers) {
                ++BOT_SESSION.currentPlayers[playerId].history.questionsPlayed;
                if(BOT_SESSION.currentAnswers[playerId] === BOT_SESSION.currentCorrectAnswer) {
                    if(!BOT_SESSION.roundScores[playerId]) {
                        BOT_SESSION.roundScores[playerId]=0;
                    }
                    ++BOT_SESSION.roundScores[playerId];
                    ++BOT_SESSION.currentPlayers[playerId].history.correctAnswers;
                }
            }       
            BOT_SESSION.questions.shift();
            chatMessage('\n The answer was ' + currentQuestion.correct_answer);
            if (BOT_SESSION.questions.length > 0) {
                chatMessage('\n Next Question in 5 seconds \n');
                setTimeout(function () {
                    doQuestion();
                }, 5000);
            } else {
                chatMessage('\n Round is over \n');
                var scoreMessage = Object.keys(BOT_SESSION.roundScores).reduce(function (scoreMessage, curKey){
                    var name = BOT_SESSION.currentPlayers[curKey].username,
                        score = BOT_SESSION.roundScores[curKey];
                        return scoreMessage.concat(name, ' ', score, '\n');
                }, '');
                 chatMessage('\n ' + scoreMessage + ' \n');
            }
        },
            10000);
    };

    var gameLoop = function gameLoop() {
        chatMessage('Loading questions.');
        BOT_SESSION.roundScores = {};
        BOT_SESSION.cu
        client({ path: 'http://opentdb.com/api.php?amount=1&type=multiple' }).then(
            function (response) {
                BOT_SESSION.questions = response.entity.results;

                    var categories = response.entity.results.reduce(function (categories, currentResult){
                        return categories + ', ' + currentResult.category; //TODO I can cat strings better than this.
                    }, '');

                chatMessage('Questions loaded. Round will start in 30 seconds. Upcoming categories are ' + categories);
                setTimeout(function(){
                    chatMessage('Starting in 5 seconds.');
                }, 25000);
                setTimeout(function(){
                    console.log('first time out');
                    doQuestion();
                }, 30000);

            },
            function (response) {
                console.error('response error: ', response);
            }
        );
    };

    var chatMessage = function chatMessage(message) {
        ddpclient.call(
            "sendMessage",
            [{ rid: BOT_SESSION.rid, msg: message }],
            function (err, result) {
                if (err) {
                    console.log('error', error);
                }
            }
        );
    };

    var RCT_COMMANDS = {
        join: function join(user) {
            console.log(user.username + ' is joining the game');

            var insertPlayer = function insertPlayer(user) {
                user.history = {
                    questionsPlayed: 0,
                    correctAnswers: 0,
                    totalPoints: 0
                };
                playerCollection.insert(user, function (err, result) {
                    BOT_SESSION.currentPlayers[user._id] = user;
                    console.log(BOT_SESSION.currentPlayers);
                    chatMessage(user.username + ' welcome to trivia. You have been registered and joined the game. Please type `rct help` for help.');
                    //TODO print user has been register and joined thye game
                });
            };

            if (!BOT_SESSION.currentPlayers[user._id]) {
                playerCollection.findOne({_id:user._id}, function (err, item) {
                    // If player is new add to playerCollection
                    if (item === null && err === null) {
                        insertPlayer(user);
                    } else {
                        //TODO handle username changes ????
                        BOT_SESSION.currentPlayers[user._id] = item;
                        chatMessage(user.username + ' (' + item.history.correctAnswers + '/' + item.history.questionsPlayed + ')  has joined the game');
                    }
                });
            } else {
                chatMessage(user.username + ' you are already in the game.');
            }
        },
        leave: function leave(user) {
            console.log(user.username + ' is leaving the game');
            var currentPlayer = BOT_SESSION.currentPlayers[user._id];
            if (currentPlayer) {
                playerCollection.update({ _id: user._id }, currentPlayer);
                //TODO may want to handle this a new way
                delete BOT_SESSION.currentPlayers[user._id]; //remove from game session 
                chatMessage('Goodbye ' + user.username + ' and thanks for playing.');
            } else {
                chatMessage(user.username + ' you can not leave a game that you are not in.');
            }
        },
        start: function start(user) {
            if(BOT_SESSION.isRoundInProgress) {
                chatMessage('Round is already in progress ' + user.username);
            } else if (Object.keys(BOT_SESSION.currentPlayers).length === 0) {
                chatMessage('There are no players in the game. Please type `rct join` to joing the game.');
            } else {
                BOT_SESSION.isRoundInProgress = true;
                chatMessage(user.username + ' has started the round.');
                gameLoop();
            }
        },
        help: function help() {
            //TODO print help
            chatMessage('`//TODO print help` lololololol');
        }
    };

    ddpclient.on('message', function (ddpMsgStr) {
        var ddpMsg = JSON.parse(ddpMsgStr);
        //TODO ingore msgs from bot
        if (ddpMsg.msg === 'changed' && ddpMsg.collection === 'stream-room-messages' && ddpMsg.fields.args[0].rid === BOT_SESSION.rid && typeof ddpMsg.fields.args[0].editedAt === 'undefined') {
            var message = ddpMsg.fields.args[0];
            if (message.msg.substring(0, 3) === 'rct') {
                var command = message.msg.substring(4).toLowerCase().trim();
                if (typeof RCT_COMMANDS[command] !== 'undefined') {
                    RCT_COMMANDS[command](message.u);
                } else {
                    //TODO print warning message and help?
                    chatMessage(message.u.username + '`'+message.msg+'` is an invalid command. Please type `rct help` for help');
                }
            } else if (BOT_SESSION.acceptingAnswers) {
                var currentUser = message.u;
                if (BOT_SESSION.currentPlayers[currentUser._id]) {
                    BOT_SESSION.currentAnswers[currentUser._id] = parseInt(message.msg.substring(0, 1));
                }
            }
        }
        //   console.log("ddp message: " + ddpMsgStr);
    });


    ddpclient.on('socket-close', function (code, message) {
        console.log("Close: %s %s", code, message);
    });

    ddpclient.on('socket-error', function (error) {
        console.log("Error: %j", error);
    });

});