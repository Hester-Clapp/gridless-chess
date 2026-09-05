// backend/interface/GameSession.js
// This is what a future websocket handler holds one of per active game.
// Its public shape (init / makeMove / snapshot) is the actual network
// protocol from your plan; only its internals change once a real
// transport exists.
//
// Client-authoritative: makeMove no longer checks whose turn it is or
// whether `position` actually lies on a legal move line for `piece` - it
// trusts the caller completely and commits exactly the move it was given.
// That trust is what lets this stay desync-free (the server never
// disagrees with the client about what happened), at the cost of a
// misbehaving client being able to move the wrong piece, out of turn, or
// anywhere on the board.
export class GameSession {
    constructor(game, board, moveExecutionService) {
        this.game = game
        this.board = board
        this.moveExecutionService = moveExecutionService
    }

    init() {
        return this.snapshot()
    }

    makeMove({ piece, position }) {
        const resultingPiece = this.moveExecutionService.commitMove(this.game, this.board, piece, position)
        return { ...this.snapshot(), movedPieceId: resultingPiece.id }
    }

    snapshot() {
        return { boardState: this.board, turn: this.game.whiteToMove, winner: this.game.winner }
        // boardState is the entity itself for now — swap for a
        // serialized form once this crosses a real network boundary
    }
}
