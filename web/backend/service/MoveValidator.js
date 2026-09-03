export class MoveValidator {
    constructor(moveCalculator) {
        this.moveCalculator = moveCalculator
    }

    validate(game, piece, position) {
        if (!game.isTurn(piece)) return { legal: false, reason: "not-your-turn" }

        const legalMoves = this.moveCalculator.calculateMoves(piece)
        return legalMoves.includesPoint(position)
            ? { legal: true }
            : { legal: false, reason: "illegal-move" }
    }
}