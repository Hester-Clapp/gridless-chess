const MOVE_LINE_COLOUR = "hsla(135, 75%, 48%, 0.75)" // green - legal move path

// Draws only the legal-move lines onto the canvas now - the pieces
// themselves are rendered as real DOM elements by PieceLayer (see
// BoardView), so a screen reader sees actual piece elements instead of
// canvas pixels. The canvas still exists purely to show a selected piece's
// possible moves.
export class Renderer {
    gameState

    constructor(gameState) {
        this.gameState = gameState
    }

    drawMoves(board, piece, ctx, flipped = false) {
        const moves = this.gameState.movesFor(piece)

        ctx.save()
        ctx.strokeStyle = MOVE_LINE_COLOUR
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.beginPath()
        for (const line of moves) {
            const from = this.toDisplayPoint(line.from, board, flipped)
            const to = this.toDisplayPoint(line.to, board, flipped)
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
        }
        ctx.stroke()
        ctx.restore()
    }

    toDisplayPoint(point, board, flipped) {
        return flipped ? board.mirror(point) : point
    }
}
