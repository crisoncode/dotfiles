'use strict';

function getDraw(player1Score) {
    let score = '';
    switch (player1Score) {
        case 0:
            score = "Love-All";
            break;
        case 1:
            score = "Fifteen-All";
            break;
        case 2:
            score = "Thirty-All";
            break;
        default:
            score = "Deuce";
            break;
    }
    return score;
}

function getScore(match) {
    const player1Score = match.player1.score;
    const player2Score = match.player1.score;
    let score = '';

    if (player1Score === player2Score) {
        score = getDraw(player1Score);
    }
    
}



const match = {
    player1: {
        score: 32
    },
    player2: {
        score: 24
    },
    stadiumName: 'paris park des princes'
};


getScore(match);