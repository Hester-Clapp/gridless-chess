import { DragGesture } from "../../shared/entity/DragGesture.js"

// Wires pointer-driven drag events onto a DragGesture. Every game-rule
// decision - what can be selected, where a drag resolves, whether it lands
// on a capture - belongs to DragMoveService; this class only sequences
// those calls against the gesture's state and reports the result.
export class DragController {
    constructor(dragMoveService, onChange, onCommitAttempt) {
        this.dragMoveService = dragMoveService
        this.onChange = onChange
        this.onCommitAttempt = onCommitAttempt
        this.gesture = new DragGesture()
    }

    start(point) {
        const selected = this.dragMoveService.pieceSelectableAt(point, this.gesture.selectedPiece)
        const dragLines = this.dragMoveService.dragLinesFor(selected)

        this.gesture.select(selected, dragLines)
        this.notify()
    }

    update(point, shiftHeld) {
        if (!this.gesture.isActive()) return

        const destination = this.gesture.withinDeadZone(point, shiftHeld)
            ? null
            : this.dragMoveService.destinationFor(this.gesture.dragLines, point)

        const captureTarget = this.dragMoveService.captureTargetAt(this.gesture.selectedPiece, destination)

        this.gesture.updateDragPosition(destination, captureTarget)
        this.notify()
    }

    end(point, shiftHeld) {
        if (!this.gesture.isActive()) return

        const destination = this.dragMoveService.destinationFor(this.gesture.dragLines, point)
        const committing = destination
            && !this.gesture.withinDeadZone(point, shiftHeld)
            && !this.gesture.withinDeadZone(destination, shiftHeld)

        // The server is authoritative now - this just asks; the actual
        // move (and the "last moved" highlight) only takes effect once its
        // update comes back over the wire, so there's no piece to record
        // here the way commitMove() used to hand one back synchronously.
        // release() (rather than clear()) is what keeps the piece pinned at
        // `destination` in the meantime instead of snapping back and forth.
        if (committing) {
            this.gesture.selectedPiece.dragPosition = destination
            this.onCommitAttempt(this.gesture.selectedPiece.id, destination)
            this.gesture.release()
        } else {
            this.gesture.clear()
        }
        this.notify()
    }

    cancel() {
        if (!this.gesture.isActive()) return
        this.gesture.clear()
        this.notify()
    }

    // Called when a commit made via end() comes back REJECTED - drops the
    // optimistic position it left pinned and re-renders the piece at its
    // real spot.
    revertLastAttempt() {
        this.gesture.revertPending()
        this.notify()
    }

    notify() {
        this.onChange(this.gesture.snapshot())
    }
}
