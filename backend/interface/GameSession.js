// backend/interface/GameSession.js
// This is what a future websocket handler holds one of per active game.
// Its public shape (init / makeMove / snapshot) is the actual network
// protocol from your plan; only its internals change once a real
// transport exists.
export class GameSession {
    constructor(game, board, moveValidator, moveExecutionService) {
        this.game = game
        this.board = board
        this.moveValidator = moveValidator
        this.moveExecutionService = moveExecutionService
    }

    init() {
        return this.snapshot()
    }

    makeMove({ piece, position }) {
        const validation = this.moveValidator.validate(this.game, piece, position)
        if (!validation.legal) return { ...this.snapshot(), rejected: true, reason: validation.reason }

        // Commit to the validator's snapped position, not whatever the
        // caller supplied - once this crosses a real network boundary the
        // server needs to stay authoritative about the exact destination.
        const resultingPiece = this.moveExecutionService.commitMove(this.game, this.board, piece, validation.position)
        return { ...this.snapshot(), movedPieceId: resultingPiece.id }
    }

    snapshot() {
        return { boardState: this.board, turn: this.game.whiteToMove, winner: this.game.winner }
        // boardState is the entity itself for now — swap for a
        // serialized form once this crosses a real network boundary
    }
}