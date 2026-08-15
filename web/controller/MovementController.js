import { RADIUS } from "../entity/geometry/constants.js"

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

    selectedPiece = null
    dragLines = null
    captureTarget = null
    lastMovedPiece = null

    constructor(game, renderer, canvas, ctx, statusDisplay, moveService, captureService, promotionService) {
        this.game = game
        this.board = game.board
        this.renderer = renderer
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay
        this.moveService = moveService
        this.captureService = captureService
        this.promotionService = promotionService

        this.canvas.addEventListener("pointerdown", event => this.onMouseDown(event))
        window.addEventListener("pointermove", event => this.onMouseMove(event))
        window.addEventListener("pointerup", event => this.onMouseUp(event))

        this.redraw()
    }

    onMouseDown(event) {
        const point = this.toBoardPoint(event)
        const piece = this.findPieceAt(point)

        this.selectedPiece = piece && piece !== this.selectedPiece && this.game.isTurn(piece) ? piece : null

        this.dragLines = this.selectedPiece
            ? this.moveService.calculateMoves(this.selectedPiece).filter(line => line !== undefined && line.length > 0)
            : null
        this.captureTarget = null

        this.redraw()
    }

    onMouseMove(event) {
        if (!this.selectedPiece || !this.dragLines) return

        const point = this.toBoardPoint(event)
        this.selectedPiece.dragPosition = this.withinDeadZone(point, event.shiftKey)
            ? null
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

        if (destination && !this.withinDeadZone(point, event.shiftKey)) {
            this.selectedPiece.position = destination
            this.selectedPiece.hasMoved = true
            this.captureService.resolveCaptures(this.board, this.selectedPiece)
            this.selectedPiece = this.promotionService.resolvePromotion(this.board, this.selectedPiece)
            this.moveService.invalidateCache()
            this.lastMovedPiece = this.selectedPiece

            const winner = this.captureService.getWinner(this.board)
            if (winner !== null) {
                this.game.declareWinner(winner)
            } else {
                this.game.advanceTurn()
            }
        }

        this.selectedPiece.dragPosition = null
        this.dragLines = null
        this.selectedPiece = null
        this.captureTarget = null

        this.redraw()
    }

    withinDeadZone(point, shiftHeld) {
        if (shiftHeld) return false

        const origin = this.selectedPiece.position
        const dx = point.x - origin.x
        const dy = point.y - origin.y
        return dx * dx + dy * dy <= DRAG_DEAD_ZONE * DRAG_DEAD_ZONE
    }

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
        const checkStatus = this.captureService.getCheckStatus(this.board, this.game.whiteToMove)
        const flipped = this.isFlipped()

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.renderer.renderBoard(this.board, this.ctx, this.captureTarget, checkStatus, flipped, this.lastMovedPiece)
        if (this.selectedPiece) this.renderer.drawMoves(this.board, this.selectedPiece, this.ctx, flipped)
        this.statusDisplay.update(this.game, checkStatus)
    }
}
