import { DragGesture } from "../../shared/entity/DragGesture.js"

export class DragController {
    constructor(game, board, moveService, captureService, onChange, onCommitAttempt) {
        this.game = game
        this.board = board
        this.moveService = moveService
        this.captureService = captureService
        this.onChange = onChange
        this.onCommitAttempt = onCommitAttempt
        this.gesture = new DragGesture()
    }

    start(point) {
        const piece = this.board.getPieceAt(point)
        const selected = piece && piece !== this.gesture.selectedPiece && this.game.isTurn(piece) ? piece : null
        const dragLines = selected ? this.moveService.calculateMoves(selected) : null

        this.gesture.select(selected, dragLines)
        this.notify()
    }

    update(point, shiftHeld) {
        if (!this.gesture.isActive()) return

        const destination = this.gesture.withinDeadZone(point, shiftHeld)
            ? null
            : this.moveService.closestLegalPoint(this.gesture.dragLines, point)

        const captureTarget = destination
            ? this.captureService.findCaptureAt(this.board, this.gesture.selectedPiece, destination)
            : null

        this.gesture.updateDragPosition(destination, captureTarget)
        this.notify()
    }

    end(point, shiftHeld) {
        if (!this.gesture.isActive()) return

        const destination = this.moveService.closestLegalPoint(this.gesture.dragLines, point)

        // The server is authoritative now - this just asks; the actual
        // move (and the "last moved" highlight) only takes effect once its
        // update comes back over the wire, so there's no piece to record
        // here the way commitMove() used to hand one back synchronously.
        if (destination && !this.gesture.withinDeadZone(point, shiftHeld) && !this.gesture.withinDeadZone(destination, shiftHeld)) {
            this.onCommitAttempt(this.gesture.selectedPiece.id, destination)
        }

        this.gesture.clear()
        this.notify()
    }

    cancel() {
        if (!this.gesture.isActive()) return
        this.gesture.clear()
        this.notify()
    }

    notify() {
        this.onChange(this.gesture.snapshot())
    }
}