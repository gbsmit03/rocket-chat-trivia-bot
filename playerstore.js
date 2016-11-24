'use strict';

var PlayerStore = function PlayerStore() {
    var Db = require('tingodb')().Db;  
    console.log(__dirname);
    this.playerDb = new Db(__dirname + '/db', {});
    this.playerCollection = this.playerDb.collection('player_collection');
};

PlayerStore.prototype.getPlayer = function _getPlayer(user) {
    var self = this;
    return new Promise(function(resolve,reject) {
        self.playerCollection.findOne({ _id: user._id }, function (err, data) {
            if(err !== null) return reject(err);
            resolve(data);
        });
    });
};

PlayerStore.prototype.createPlayer = function createPlayer(user) {
    var self = this;
    user.history = {
        questionsPlayed: 0,
        correctAnswers: 0,
        totalPoints: 0
    };
    return new Promise(function (resolve, reject) {
        self.playerCollection.insert(user, function (err, data) {
            if (err !== null) return reject(err);
            resolve(data);
        });
    });
};

//TODO add error handling and return promise??
PlayerStore.prototype.updatePlayer = function updatePlayer(user){
    this.playerCollection.update({ _id: user._id }, user);
};

module.exports = PlayerStore;