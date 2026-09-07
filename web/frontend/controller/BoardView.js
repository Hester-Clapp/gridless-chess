// Draws one frame: the selected piece's move lines onto the canvas, the
// pieces as DOM elements over it, and the status line beside it. Everything
// about the match itself is read from GameStateService as the frame is
// drawn, so this is built once per connection rather than per turn.
export class BoardView {
    constructor(gameState, renderer, pieceLayer, canvas, ctx, statusDisplay) {
        this.gameState = gameState
        this.renderer = renderer
        this.pieceLayer = pieceLayer
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay
    }

    render(gesture) {
        const board = this.gameState.board
        const checkStatus = this.gameState.checkStatus()
        const flipped = this.gameState.isFlipped

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        if (gesture.selectedPiece) this.renderer.drawMoves(board, gesture.selectedPiece, this.ctx, flipped)
        this.pieceLayer.sync(board, {
            captureTarget: gesture.captureTarget,
            checkStatus,
            flipped,
            lastMovedPiece: gesture.lastMovedPiece,
            selectedPiece: gesture.selectedPiece,
        })
        this.statusDisplay.update(this.gameState.game, checkStatus, this.gameState.reason)
    }
}
