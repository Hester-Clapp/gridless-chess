const HIGHLIGHT_S = 75
const HIGHLIGHT_L = 48
const PIECE_HIGHLIGHT_COLOUR = `hsl(200, ${HIGHLIGHT_S}%, ${HIGHLIGHT_L}%)` // gold - piece being dragged
const THREAT_HIGHLIGHT_COLOUR = `hsl(28, ${HIGHLIGHT_S}%, ${HIGHLIGHT_L}%)` // orange - piece delivering check
const CAPTURE_HIGHLIGHT_COLOUR = `hsl(355, ${HIGHLIGHT_S}%, ${HIGHLIGHT_L}%)` // red - piece about to be captured
const MOVE_LINE_COLOUR = "hsla(135, 75%, 48%, 0.75)" // green - legal move path

const ASSET_DIR = new URL("../assets/", import.meta.url)

export class Renderer {
    images = new Map()

    renderBoard(board, ctx, captureTarget = null, checkStatus = { king: null, threats: [] }, flipped = false, lastMovedPiece = null) {
        this.drawPieces(board, ctx, captureTarget, checkStatus, flipped, lastMovedPiece)
    }

    drawPieces(board, ctx, captureTarget = null, checkStatus = { king: null, threats: [] }, flipped = false, lastMovedPiece = null) {
        const inCheck = checkStatus.threats.length > 0
        for (const piece of board.getAllPieces()) {
            const highlight = piece === captureTarget ? "capture"
                : inCheck && piece === checkStatus.king ? "check"
                : inCheck && checkStatus.threats.includes(piece) ? "threat"
                : piece === lastMovedPiece ? "lastMove"
                : null
            this.drawPiece(piece, ctx, highlight, board, flipped)
        }
    }

    drawPiece(piece, ctx, highlight = null, board = null, flipped = false) {
        const image = this.getImage(piece.assetName)

        const draw = () => {
            const { x, y } = this.toDisplayPoint(piece.renderPosition, board, flipped)
            const size = piece.radius * 2
            ctx.moveTo(x + piece.radius, y)
            ctx.beginPath()
            ctx.arc(x, y, piece.radius, 0, 2 * Math.PI)
            ctx.closePath()
            ctx.lineWidth = highlight === "check" ? 4 : 2
            ctx.strokeStyle = highlight === "selected" ? PIECE_HIGHLIGHT_COLOUR
                : highlight === "lastMove" ? PIECE_HIGHLIGHT_COLOUR
                : highlight === "capture" ? CAPTURE_HIGHLIGHT_COLOUR
                : highlight === "check" ? CAPTURE_HIGHLIGHT_COLOUR
                : highlight === "threat" ? THREAT_HIGHLIGHT_COLOUR
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

    drawMoves(board, piece, ctx, flipped = false) {
        this.drawPiece(piece, ctx, "selected", board, flipped)

        const moves = board.calculateMoves(piece)

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
        return flipped
            ? { x: board.width - point.x, y: board.height - point.y }
            : point
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
