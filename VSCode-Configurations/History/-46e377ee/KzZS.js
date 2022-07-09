export class Match {
    
    static typesOfDraw = [
        'Love-All',
        'Fifteen-All',
        'Thirty-All'
    ];

    static defaultDraw = 'Deuce';

    constructor(args) {
        this.player1 = args.player1;
        this.player2 = args.player2;
    }

    isADeuceDraw() {
        if (this.player1.score > 2)
            return true;
    }

    isDraw() {
        if (this.player1.score == this.player2.score )
    }
    getTypeOfDraw() {
        if (this.isADeuceDraw()) {
            return defaultDraw;
        }
        return typesOfDraw(this.player1.score);
    }

    getAdvantage() {

    }

    getScore() {

        if (this.isDraw()) {
            return this.getTypeOfDraw();
        }
        
        if (this.player1.score >= 4 || this.player2.score >= 4) {
            var minusResult = m_score1 - m_score2;    
        }
    }
}