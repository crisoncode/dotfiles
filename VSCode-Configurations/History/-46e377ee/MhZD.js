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
        if (this.player1.score == this.player2.score ) {
            return true;
        } 
        
        return false;
    }
    
    getTypeOfDraw() {
        if (this.isADeuceDraw()) {
            return defaultDraw;
        }
        return typesOfDraw(this.player1.score);
    }

    getMinusResult() {
        return this.player1.score - this.player2.score;
    }
    
    isAdvantage(minusResult) {
        if (this.player1.score >= 4 || this.player2.score >= 4 
            &&  (minusResult < 2 && minusResult > -2))
            return true
        else
            return false
    }

    getAdvantage(minusResult) {
        if (minusResult === 1) {
            return "Advantage player1";
        }
        
        if (minusResult === -1) {
            return "Advantage player2";
        }
    }

    getScore() {
        if (this.isDraw()) {
            return this.getTypeOfDraw();
        }
        
        let minusResult = this.getMinusResult();
        if (isAdvantage(minusResult)) {
            return this.getAdvantage(minusResult);
        }

    }
}
