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

        this.moveExecutionService.commitMove(this.game, this.board, piece, position)
        return this.snapshot()
    }

    snapshot() {
        return { boardState: this.board, turn: this.game.whiteToMove }
        // boardState is the entity itself for now — swap for a
        // serialized form once this crosses a real network boundary
    }
}