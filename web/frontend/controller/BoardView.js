export class BoardView {
    constructor(game, board, renderer, pieceLayer, canvas, ctx, statusDisplay, captureService, isFlipped, reason = null) {
        this.game = game
        this.board = board
        this.renderer = renderer
        this.pieceLayer = pieceLayer
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay
        this.captureService = captureService
        this.isFlipped = isFlipped
        this.reason = reason // the wire UPDATE's forfeit marker, if the game ended that way - see StatusDisplay
    }

    render(gesture) {
        const checkStatus = this.captureService.getCheckStatus(this.board, this.game.whiteToMove)
        const flipped = this.isFlipped()

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        if (gesture.selectedPiece) this.renderer.drawMoves(this.board, gesture.selectedPiece, this.ctx, flipped)
        this.pieceLayer.sync(this.board, {
            captureTarget: gesture.captureTarget,
            checkStatus,
            flipped,
            lastMovedPiece: gesture.lastMovedPiece,
            selectedPiece: gesture.selectedPiece,
        })
        this.statusDisplay.update(this.game, checkStatus, this.reason)
    }
}
