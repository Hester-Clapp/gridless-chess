export class BoardView {
    constructor(game, board, renderer, canvas, ctx, statusDisplay, captureService, isFlipped) {
        this.game = game
        this.board = board
        this.renderer = renderer
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay
        this.captureService = captureService
        this.isFlipped = isFlipped
    }

    render(gesture) {
        const checkStatus = this.captureService.getCheckStatus(this.board, this.game.whiteToMove)
        const flipped = this.isFlipped()

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.renderer.renderBoard(this.board, this.ctx, gesture.captureTarget, checkStatus, flipped, gesture.lastMovedPiece)
        if (gesture.selectedPiece) this.renderer.drawMoves(this.board, gesture.selectedPiece, this.ctx, flipped)
        this.statusDisplay.update(this.game, checkStatus)
    }
}