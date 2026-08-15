import { RADIUS } from "../entity/geometry/constants.js"
import { CaptureService } from "../service/CaptureService.js"

// How close the mouse has to stay to the piece's own square for a drag to
// count as "didn't really move" - keeps an unsteady click from reading as
// an aborted micro-move. Tied to the piece's own click-radius since that's
// already the notion of "on this square" used elsewhere in this file.
const DRAG_DEAD_ZONE = RADIUS

export class MovementController {
    game
    board
    renderer
    canvas
    ctx
    statusDisplay
    selectedPiece = null
    captureService = new CaptureService()

    // The piece's legal-move lines, captured once at the start of a drag.
    // Recomputing them mid-drag would be wrong: they're anchored to the
    // piece's real position, which doesn't change until the move commits,
    // so there's nothing to invalidate them until then. null when no drag
    // is in progress.
    dragLines = null

    // The enemy piece the current drag would capture if dropped where it
    // currently sits, or null. Recomputed on every drag move so the render
    // highlight always matches the live drag position.
    captureTarget = null

    // The piece whose move most recently landed, or null before either side
    // has moved. Highlighted on redraw so a player can see what their
    // opponent just did.
    lastMovedPiece = null

    constructor(game, renderer, canvas, ctx, statusDisplay) {
        this.game = game
        this.board = game.board
        this.renderer = renderer
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay

        this.canvas.addEventListener("pointerdown", event => this.onMouseDown(event))
        // Listened for on the window, not the canvas, so a drag that ends
        // outside the canvas bounds still resolves instead of getting stuck.
        window.addEventListener("pointermove", event => this.onMouseMove(event))
        window.addEventListener("pointerup", event => this.onMouseUp(event))

        this.redraw()
    }

    onMouseDown(event) {
        const point = this.toBoardPoint(event)
        const piece = this.findPieceAt(point)

        // Clicking the already-selected piece (or empty space) deselects
        // it, rather than leaving its moves stuck on screen. A piece whose
        // colour isn't on the move is treated the same as empty space -
        // there's nothing legal to do with it yet.
        this.selectedPiece = piece && piece !== this.selectedPiece && this.game.isTurn(piece) ? piece : null

        this.dragLines = this.selectedPiece
            // Zero-length lines (a direction that's entirely obstructed)
            // are dropped here: Line.distanceTo() collapses to a constant
            // 0 for those, which would make them look like the closest
            // line to any mouse position and hijack the drag.
            ? this.board.calculateMoves(this.selectedPiece).filter(line => line !== undefined && line.length > 0)
            : null
        this.captureTarget = null

        this.redraw()
    }

    onMouseMove(event) {
        if (!this.selectedPiece || !this.dragLines) return

        const point = this.toBoardPoint(event)
        this.selectedPiece.dragPosition = this.withinDeadZone(point, event.shiftKey)
            ? null // Snap back to the real square rather than micro-jitter along a line.
            : this.closestPointOnLines(point)

        this.captureTarget = this.selectedPiece.dragPosition
            ? this.captureService.findCaptureAt(this.board, this.selectedPiece, this.selectedPiece.dragPosition)
            : null

        this.redraw()
    }

    onMouseUp(event) {
        if (!this.selectedPiece || !this.dragLines) return

        const point = this.toBoardPoint(event)
        const destination = this.closestPointOnLines(point)

        if (destination && !this.withinDeadZone(destination, event.shiftKey)) {
            this.selectedPiece.position = destination
            this.selectedPiece.hasMoved = true
            this.captureService.resolveCaptures(this.board, this.selectedPiece)
            // The move (and any capture it caused) can change what's legal
            // for every piece on the board, not just this one, so drop the
            // cached calculateMoves() result rather than trying to reason
            // about which pieces are affected.
            this.board.invalidateMoveCache()
            this.lastMovedPiece = this.selectedPiece
            // Only a move that actually lands (as opposed to an
            // aborted drag, handled below) hands the turn over.
            this.game.advanceTurn()
        }

        this.selectedPiece.dragPosition = null
        this.dragLines = null
        this.selectedPiece = null
        this.captureTarget = null

        this.redraw()
    }

    // Distance from the piece's own (undragged) square, in board pixels.
    // Holding shift disables the dead zone entirely, for players who want
    // every drag to register immediately.
    withinDeadZone(point, shiftHeld) {
        if (shiftHeld) return false

        const origin = this.selectedPiece.position
        const dx = point.x - origin.x
        const dy = point.y - origin.y
        return dx * dx + dy * dy <= DRAG_DEAD_ZONE * DRAG_DEAD_ZONE
    }

    // The point on any of the piece's legal-move lines closest to `point`,
    // or null if the piece has no legal moves to snap to.
    closestPointOnLines(point) {
        let closest = null
        let closestDistance = Infinity
        for (const line of this.dragLines) {
            const distance = line.distanceTo(point)
            if (distance < closestDistance) {
                closestDistance = distance
                closest = line.closestPoint(point)
            }
        }
        return closest
    }

    // Click coordinates arrive in CSS pixels relative to the viewport, but
    // piece positions are in canvas pixels, so this maps one to the other -
    // accounting for the canvas being scaled/resized by CSS. Also undoes the
    // 180° rotation the renderer applies when it's black's turn, so a click
    // still lands on whatever's drawn under the cursor - the result is
    // still a real board coordinate, so nothing downstream needs to know
    // the board was ever flipped.
    toBoardPoint(event) {
        const rect = this.canvas.getBoundingClientRect()
        const scaleX = this.canvas.width / rect.width
        const scaleY = this.canvas.height / rect.height
        const point = {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        }
        return this.isFlipped()
            ? { x: this.board.width - point.x, y: this.board.height - point.y }
            : point
    }

    // Black's turn is drawn rotated 180° so whoever's on move has their own
    // pieces at the bottom of the screen.
    isFlipped() {
        return !this.game.whiteToMove
    }

    findPieceAt(point) {
        return this.board.getAllPieces().find(piece => {
            const dx = piece.position.x - point.x
            const dy = piece.position.y - point.y
            return dx * dx + dy * dy <= piece.radius * piece.radius
        })
    }

    redraw() {
        const checkStatus = this.game.getCheckStatus()

        const flipped = this.isFlipped()

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.renderer.renderBoard(this.board, this.ctx, this.captureTarget, checkStatus, flipped, this.lastMovedPiece)
        if (this.selectedPiece) this.renderer.drawMoves(this.board, this.selectedPiece, this.ctx, flipped)
        this.statusDisplay.update(this.game, checkStatus)
    }
}
