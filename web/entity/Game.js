// Owns whose turn it is. Kept separate from Board - which only knows about
// piece positions - because turn order is a rule of the match, not a
// property of the board itself.
export class Game {
    board
    whiteToMove = true

    constructor(board) {
        this.board = board
    }

    // Whether `piece` is allowed to move right now.
    isTurn(piece) {
        return piece.white === this.whiteToMove
    }

    advanceTurn() {
        // this.whiteToMove = !this.whiteToMove
    }
}
