'use strict';

var Game = function Game() {};

Game.prototype.start = function start() {
    console.log('in game start.');
    var self = this;
    //TODO testing getting questions
    this.questionStore.getQuestions(5).then(function (questions){
        debugger;
    });//TODO error handling 
};

module.exports = Game;