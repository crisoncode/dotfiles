'use strict';

function getScore(m_score1, m_score2, stadiumName) {
    var score = "";
    var tempScore = 0;
    if (m_score1 === m_score2) {
        switch (m_score1) {
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
    } 

    return score;
}

module.exports = getScore;
