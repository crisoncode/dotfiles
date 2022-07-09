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

    getTypeOfDraw() {
        if (this.isADeuceDraw()) {
            return defaultDraw;
        }
        return typesOfDraw(this.player1);
    }
}