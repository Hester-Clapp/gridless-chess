// One match's game state and the operations on it: seeding the first
// snapshot, committing a move, and ending the match by forfeit. Everything
// above this (GameSessionTransport, MatchServer) works through these
// methods rather than reaching for the Board/Game entities themselves.
//
// Client-authoritative: makeMove doesn't check whose turn it is, whether
// each position lies on a legal move line, or whether a move that shifts
// two pieces at once had any business doing so - it trusts the caller
// completely and commits exactly the move it was given. That trust is what
// lets this stay desync-free (the server never disagrees with the client
// about what happened), at the cost of a misbehaving client being able to
// move the wrong piece, out of turn, or anywhere on the board.
export class GameSession {
    constructor(game, board, moveExecutionService) {
        this.game = game
        this.board = board
        this.moveExecutionService = moveExecutionService
    }

    init() {
        return this.snapshot()
    }

    // `moves` is every piece this move shifts, in the order the client sent
    // them, the first being the one it was actually about.
    makeMove({ moves }) {
        const resultingPiece = this.moveExecutionService.commitMove(this.game, this.board, moves)
        return { ...this.snapshot(), movedPieceId: resultingPiece.id }
    }

    // Ends the match against whoever just disconnected, or null if there's
    // nothing to end - a disconnect after a winner was already decided is
    // just the losing or winning side's tab closing after the fact, not a
    // second ending. Callers use that null to tell the two apart.
    forfeit(disconnectedWhite) {
        if (this.game.isOver) return null
        this.game.declareWinner(!disconnectedWhite)
        return this.snapshot()
    }

    // The piece an incoming move names, or undefined. Here rather than on
    // the transport so decoding a move never has to reach into the board.
    findPiece(id) {
        return this.board.getPieceById(id)
    }

    get isOver() {
        return this.game.isOver
    }

    snapshot() {
        return { boardState: this.board, turn: this.game.whiteToMove, winner: this.game.winner }
        // boardState is the entity itself - GameSessionTransport is what
        // turns it into a wire form on the way out
    }
}
