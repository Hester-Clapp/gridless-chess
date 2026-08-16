// Commits a move a player has already decided on: moving a piece is never
// just a position change - a capture, a promotion, and a win/turn-advance
// decision all hang off it, in that order, and something has to own
// sequencing them. moveService/captureService/promotionService each know
// their own rule but not when to run relative to the others - that's this
// service's job.
export class MoveExecutionService {
    moveService
    captureService
    promotionService

    constructor(moveService, captureService, promotionService) {
        this.moveService = moveService
        this.captureService = captureService
        this.promotionService = promotionService
    }

    commitMove(game, board, piece, destination) {
        piece.position = destination
        piece.hasMoved = true
        this.captureService.resolveCaptures(board, piece)
        const resultingPiece = this.promotionService.resolvePromotion(board, piece)
        this.moveService.invalidateCache()

        const winner = this.captureService.getWinner(board)
        if (winner !== null) {
            game.declareWinner(winner)
        } else {
            game.advanceTurn()
        }

        return resultingPiece
    }
}
