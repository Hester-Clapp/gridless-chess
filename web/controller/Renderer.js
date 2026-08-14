import { SPACE, TAU } from "../entity/geometry/constants.js"

const MOVE_LINE_COLOUR = "rgba(0, 160, 0, 0.7)"
const PIECE_HIGHLIGHT_COLOUR = "rgb(230, 200, 0)"
const CAPTURE_HIGHLIGHT_COLOUR = "rgb(220, 40, 40)"

// Resolved relative to this module rather than the page, so the renderer
// works no matter where index.html ends up serving from.
const ASSET_DIR = new URL("../assets/", import.meta.url)

export class Renderer {
    // Piece images are shared across every piece of the same type/colour,
    // and loading is async, so they're cached here instead of on the piece.
    images = new Map()

    // `captureTarget`, if given, is the piece that would be captured were
    // the in-progress drag dropped where it currently sits - flagged red so
    // the player can see what a drop will take before committing to it.
    renderBoard(board, ctx, captureTarget = null) {
        this.drawPieces(board, ctx, captureTarget)
    }

    drawPieces(board, ctx, captureTarget = null) {
        for (const piece of board.getAllPieces()) {
            this.drawPiece(piece, ctx, piece === captureTarget ? "capture" : null)
        }
    }

    // `highlight` is null for a plain piece, "selected" for the piece being
    // dragged, or "capture" for a piece the current drag would take.
    drawPiece(piece, ctx, highlight = null) {
        const image = this.getImage(piece.assetName)

        // Position/size are read inside the closure (not captured up front)
        // so a draw that was waiting on a slow image load still reflects
        // where the piece is by the time it actually fires. renderPosition
        // (rather than position) is what tracks a drag in progress.
        const draw = () => {
            const { x, y } = piece.renderPosition
            const size = piece.radius * 2
            ctx.moveTo(x + piece.radius, y)
            ctx.beginPath()
            ctx.arc(x, y, piece.radius, 0, TAU)
            ctx.closePath()
            ctx.lineWidth = 2
            ctx.strokeStyle = highlight === "selected" ? PIECE_HIGHLIGHT_COLOUR
                : highlight === "capture" ? CAPTURE_HIGHLIGHT_COLOUR
                : "lightgrey"
            ctx.stroke()
            ctx.drawImage(
                image,
                x - piece.radius,
                y - piece.radius,
                size,
                size
            )
        }

        if (image.complete) draw()
        else image.addEventListener("load", draw, { once: true })
    }

    drawMoves(board, piece, ctx) {
        this.drawPiece(piece, ctx, "selected")

        // calculateMoves() returns undefined for a direction that's been
        // clamped away entirely (e.g. off the edge of the board), so those
        // need dropping before anything gets drawn.
        const moves = board.calculateMoves(piece).filter(line => line !== undefined)

        ctx.save()
        ctx.strokeStyle = MOVE_LINE_COLOUR
        ctx.lineWidth = 4
        ctx.lineCap = "round"
        ctx.beginPath()
        for (const line of moves) {
            ctx.moveTo(line.from.x, line.from.y)
            ctx.lineTo(line.to.x, line.to.y)
        }
        ctx.stroke()
        ctx.restore()
    }

    getImage(name) {
        let image = this.images.get(name)
        if (!image) {
            image = new Image()
            image.src = new URL(name, ASSET_DIR).href
            this.images.set(name, image)
        }
        return image
    }
}
