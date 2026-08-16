import { RADIUS } from "../entity/geometry/constants.js"
import { Circle } from "../entity/geometry/Circle.js"

const DRAG_DEAD_ZONE = RADIUS

export class MovementController {
    game
    board
    renderer
    canvas
    ctx
    statusDisplay
    moveService
    captureService
    promotionService
    moveExecutionService

    selectedPiece = null
    dragLines = null
    captureTarget = null
    lastMovedPiece = null

    constructor(game, renderer, canvas, ctx, statusDisplay, moveService, captureService, promotionService, moveExecutionService) {
        this.game = game
        this.board = game.board
        this.renderer = renderer
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay
        this.moveService = moveService
        this.captureService = captureService
        this.promotionService = promotionService
        this.moveExecutionService = moveExecutionService

        this.canvas.addEventListener("pointerdown", event => this.onMouseDown(event))
        window.addEventListener("pointermove", event => this.onMouseMove(event))
        window.addEventListener("pointerup", event => this.onMouseUp(event))
        window.addEventListener("pointercancel", event => this.onMouseCancel(event))

        this.redraw()
    }

    onMouseDown(event) {
        // Touch input has no hover, and without this the browser treats the
        // gesture as a page scroll/zoom and never delivers pointerup at all -
        // capturing the pointer keeps the whole drag routed to the canvas
        // even if a finger drifts outside its bounds.
        event.preventDefault()
        this.canvas.setPointerCapture?.(event.pointerId)

        const point = this.toBoardPoint(event)
        const piece = this.board.getPieceAt(point)

        this.selectedPiece = piece && piece !== this.selectedPiece && this.game.isTurn(piece) ? piece : null

        this.dragLines = this.selectedPiece
            ? this.moveService.calculateMoves(this.selectedPiece)
            : null
        this.captureTarget = null

        this.redraw()
    }

    onMouseMove(event) {
        if (!this.selectedPiece || !this.dragLines) return

        const point = this.toBoardPoint(event)
        this.selectedPiece.dragPosition = this.withinDeadZone(point, event.shiftKey)
            ? null
            : this.moveService.closestLegalPoint(this.dragLines, point)

        this.captureTarget = this.selectedPiece.dragPosition
            ? this.captureService.findCaptureAt(this.board, this.selectedPiece, this.selectedPiece.dragPosition)
            : null

        this.redraw()
    }

    onMouseUp(event) {
        if (!this.selectedPiece || !this.dragLines) return

        const point = this.toBoardPoint(event)
        const destination = this.moveService.closestLegalPoint(this.dragLines, point)

        if (destination && !this.withinDeadZone(point, event.shiftKey) && !this.withinDeadZone(destination, event.shiftKey)) {
            this.selectedPiece = this.moveExecutionService.commitMove(this.game, this.board, this.selectedPiece, destination)
            this.lastMovedPiece = this.selectedPiece
        }

        this.endDrag()
    }

    // Fires instead of pointerup when the OS/browser interrupts the touch
    // (e.g. an incoming call, or the system deciding it's a scroll after
    // all) - just abandon the drag rather than leaving the piece stuck.
    onMouseCancel() {
        if (!this.selectedPiece || !this.dragLines) return

        this.endDrag()
    }

    endDrag() {
        this.selectedPiece.dragPosition = null
        this.dragLines = null
        this.selectedPiece = null
        this.captureTarget = null

        this.redraw()
    }

    withinDeadZone(point, shiftHeld) {
        if (shiftHeld) return false

        return new Circle(this.selectedPiece.position, DRAG_DEAD_ZONE).containsPoint(point)
    }

    toBoardPoint(event) {
        const rect = this.canvas.getBoundingClientRect()
        const scaleX = this.canvas.width / rect.width
        const scaleY = this.canvas.height / rect.height
        const point = {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        }
        return this.isFlipped() ? this.board.mirror(point) : point
    }

    isFlipped() {
        return !this.game.whiteToMove
    }

    redraw() {
        const checkStatus = this.captureService.getCheckStatus(this.board, this.game.whiteToMove)
        const flipped = this.isFlipped()

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.renderer.renderBoard(this.board, this.ctx, this.captureTarget, checkStatus, flipped, this.lastMovedPiece)
        if (this.selectedPiece) this.renderer.drawMoves(this.board, this.selectedPiece, this.ctx, flipped)
        this.statusDisplay.update(this.game, checkStatus)
    }
}
