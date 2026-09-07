// Owns whose turn it is. Kept separate from Board - which only knows about
// piece positions - because turn order is a rule of the match, not a
// property of the board itself.
export class Game {
    board
    whiteToMove = true
    time = { white: 0, black: 0 }

    // Colour of the side that's won, or null while the match is still in
    // progress. Just a flag Game holds - deciding *when* someone's won
    // (e.g. that capturing the king does it) is the server's call, not
    // this entity's.
    winner = null

    constructor(board, gameLength) {
        this.board = board
        this.time.white = gameLength
        this.time.black = gameLength
    }

    // Whether `piece` is allowed to move right now.
    isTurn(piece) {
        return piece.white === this.whiteToMove && !this.isOver
    }

    // True once a winner has been declared - the match is decided and no
    // further moves are legal.
    get isOver() {
        return this.winner !== null
    }

    advanceTurn() {
        this.whiteToMove = !this.whiteToMove
    }

    // Ends the match in favour of `white`. Callers decide when that's
    // warranted (see MoveExecutionService.getWinner()) - Game just records it.
    declareWinner(white) {
        this.winner = white
    }
}
