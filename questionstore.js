'use strict';

var rest = require('rest'),
    mime = require('rest/interceptor/mime'),
    errorCode = require('rest/interceptor/errorCode');

var QuestionStore = function QuestionStore() {
    this.client = rest.wrap(mime)
             .wrap(errorCode, { code: 500 });
            
};

QuestionStore._doRandomAnswers = function _doRandomAnswers(question) {
    var randomList = [],
        unRandomList = question.incorrect_answers,
        correctAnswer = question.correct_answer,
        correctAnswerIndex = -1,
        getRandomIntInclusive = function getRandomIntInclusive(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        unRandomList.push(correctAnswer);

    while (unRandomList.length > 0) {
        var randomIndex = getRandomIntInclusive(0, unRandomList.length - 1);
        randomList.push(unRandomList.splice(randomIndex, 1)[0]);
        if (randomList[randomList.length - 1] === correctAnswer) {
            correctAnswerIndex = randomList.length-1;
        }
    }
    return {
        randomQuestions: randomList,
        correctAnswerIndex: correctAnswerIndex
    };
};

QuestionStore.prototype.getQuestions = function getQuestions(numberOfQuestions) {
    var numberOfQuestions = numberOfQuestions ? numberOfQuestions : 5;

    return this.client({ path: 'http://opentdb.com/api.php?amount=' + numberOfQuestions + '&type=multiple' }).then(
        function (response) {
            var data = response.entity.results,
                questions = data.map(function (currentQuestion) {
                    currentQuestion.randomAnswers = QuestionStore._doRandomAnswers(currentQuestion);
                    return currentQuestion;
                }),
                categoriesList = response.entity.results.reduce(function (categoriesList, currentResult) {
                    categoriesList.push(currentResult.category);
                    return categoriesList;
                }, []),
                categories = categoriesList.join(', ');
            return new Promise(function (resolve) { 
                resolve({
                    categories: categories,
                    questions: questions
                }) 
            });
        },
        function (err) {
            console.error('response error: ', err);
            return new Promise(function (resolve, error) { error(err) });
        }
    );
};

module.exports = QuestionStore;