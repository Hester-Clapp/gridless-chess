const ASSET_DIR = new URL("../../assets/", import.meta.url)

// Renders board pieces as real DOM <img> elements, layered over the
// move-line canvas (see Renderer/BoardView), instead of drawing them into
// it - so a screen reader (or anything else walking the DOM) sees actual
// piece elements rather than canvas pixels. Position and size are set in
// percentages of the container, which is what lets a piece land in exactly
// the spot Renderer's canvas drawing would have used, independent of screen
// size: the container is CSS-scaled from the same 800x800 logical board
// space the canvas is stretched from, so a percentage of one tracks a
// percentage of the other automatically. The one thing percentages can't
// express is the highlight ring's thickness (outline-width takes a length,
// not a percentage) - --unit, refreshed on resize, is a live px-per-logical-
// unit conversion factor so that ring keeps scaling with the board the same
// way the canvas's line width used to.
//
// Built once per connection (see GameScreenController) and kept across
// turns - each sync() call moves/restyles/removes the same elements by
// piece id rather than rebuilding them, since Board/Piece are wholesale
// replacements every turn (see GameScreenController) but a piece's id
// round-trips across the wire (see PieceSerializer) and so still identifies
// "the same piece" from one snapshot to the next; a captured piece's id
// simply stops appearing, and PromotionService keeps a pawn's id when it
// becomes a queen, so an id disappearing is exactly what should delete an
// element, never what should reuse one.
export class PieceLayer {
    constructor(container) {
        this.container = container
        this.tokens = new Map() // piece.id -> { el, img, type, white }
        this.boardWidth = null

        this.resizeObserver = new ResizeObserver(() => this.updateScale())
        this.resizeObserver.observe(container)
    }

    updateScale() {
        if (!this.boardWidth) return
        const width = this.container.clientWidth
        if (width > 0) this.container.style.setProperty("--unit", `${width / this.boardWidth}px`)
    }

    // `flipped`/`selectedPiece`/`captureTarget`/`checkStatus`/`lastMovedPiece`
    // mirror exactly what Renderer.drawPieces used to take - see BoardView.
    sync(board, { captureTarget = null, checkStatus = { king: null, threats: [] }, flipped = false, lastMovedPiece = null, selectedPiece = null } = {}) {
        this.boardWidth = board.width
        this.updateScale()

        const inCheck = checkStatus.threats.length > 0
        const seen = new Set()

        for (const piece of board.getAllPieces()) {
            seen.add(piece.id)
            const token = this.getOrCreateToken(piece)
            this.positionToken(token, piece, board, flipped)
            this.highlightToken(token, piece, { captureTarget, checkStatus, inCheck, lastMovedPiece, selectedPiece })
        }

        for (const [id, token] of this.tokens) {
            if (seen.has(id)) continue
            token.el.remove()
            this.tokens.delete(id)
        }
    }

    getOrCreateToken(piece) {
        let token = this.tokens.get(piece.id)
        if (!token) {
            const el = document.createElement("div")
            el.className = "piece"
            const img = document.createElement("img")
            img.className = "piece-img"
            el.appendChild(img)
            this.container.appendChild(el)
            token = { el, img, type: null, white: null }
            this.tokens.set(piece.id, token)
        }

        // A pawn keeps its id when PromotionService turns it into a queen -
        // the only case where the same token needs a different image.
        if (token.type !== piece.type || token.white !== piece.white) {
            token.img.src = this.assetUrlFor(piece)
            token.img.alt = this.altTextFor(piece)
            token.type = piece.type
            token.white = piece.white
        }

        return token
    }

    positionToken(token, piece, board, flipped) {
        const { x, y } = flipped ? board.mirror(piece.renderPosition) : piece.renderPosition
        const size = piece.radius * 2
        token.el.style.left = `${(x - piece.radius) / board.width * 100}%`
        token.el.style.top = `${(y - piece.radius) / board.height * 100}%`
        token.el.style.width = `${size / board.width * 100}%`
        token.el.style.height = `${size / board.height * 100}%`
    }

    // Mirrors the highlight priority Renderer.drawPieces/drawMoves used to
    // apply: a piece being dragged (selectedPiece) always wins, since a
    // fresh drawMoves() call used to paint over whatever drawPieces() drew
    // for it; failing that, capture beats check beats threat beats
    // lastMove.
    highlightToken(token, piece, { captureTarget, checkStatus, inCheck, lastMovedPiece, selectedPiece }) {
        const highlight = piece === selectedPiece ? "selected"
            : piece === captureTarget ? "capture"
            : inCheck && piece === checkStatus.king ? "check"
            : inCheck && checkStatus.threats.includes(piece) ? "threat"
            : piece === lastMovedPiece ? "lastMove"
            : null

        token.el.classList.toggle("hl-piece", highlight === "selected" || highlight === "lastMove")
        token.el.classList.toggle("hl-capture", highlight === "capture" || highlight === "check")
        token.el.classList.toggle("hl-check", highlight === "check")
        token.el.classList.toggle("hl-threat", highlight === "threat")
    }

    assetUrlFor(piece) {
        return new URL(`${piece.type}-${piece.white ? "w" : "b"}.svg`, ASSET_DIR).href
    }

    altTextFor(piece) {
        return `${piece.white ? "White" : "Black"} ${piece.type}`
    }

    // Called from GameScreenController.reset() before a fresh initScreen()
    // builds a new PieceLayer for the next connection - drops every element
    // and stops watching the (about to be reused) container's size.
    destroy() {
        this.resizeObserver.disconnect()
        for (const token of this.tokens.values()) token.el.remove()
        this.tokens.clear()
    }
}
