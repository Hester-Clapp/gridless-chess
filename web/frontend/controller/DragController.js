import { DragGesture } from "../../shared/entity/DragGesture.js"

// Wires pointer-driven drag events onto a DragGesture. Every game-rule
// decision - what can be selected, where a drag resolves, whether it lands
// on a capture - belongs to GameStateService; this class only sequences
// those calls against the gesture's state and reports the result.
export class DragController {
    constructor(gameState, onChange, onCommitAttempt) {
        this.gameState = gameState
        this.onChange = onChange
        this.onCommitAttempt = onCommitAttempt
        this.gesture = new DragGesture()
    }

    start(point) {
        const selected = this.gameState.pieceSelectableAt(point, this.gesture.selectedPiece)
        const dragLines = this.gameState.dragLinesFor(selected)

        this.gesture.select(selected, dragLines)
        this.notify()
    }

    update(point, shiftHeld) {
        if (!this.gesture.isActive()) return

        const destination = this.gesture.withinDeadZone(point, shiftHeld)
            ? null
            : this.gameState.destinationFor(this.gesture.dragLines, point)

        const captureTarget = this.gameState.captureTargetAt(this.gesture.selectedPiece, destination)

        this.gesture.updateDragPosition(destination, captureTarget)
        this.notify()
    }

    end(point, shiftHeld) {
        if (!this.gesture.isActive()) return

        const destination = this.gameState.destinationFor(this.gesture.dragLines, point)
        const committing = destination
            && !this.gesture.withinDeadZone(point, shiftHeld)
            && !this.gesture.withinDeadZone(destination, shiftHeld)

        // The move is decided here but applied by the server - this just
        // asks; the actual move (and the "last moved" highlight) only takes
        // effect once its update comes back over the wire, so there's no
        // piece to record here. Built before release(), while the piece is
        // still on its starting square, since that's what tells a castle
        // from an ordinary king move. release() (rather than clear()) is
        // what keeps the piece pinned at `destination` in the meantime
        // instead of snapping back and forth.
        if (committing) {
            const move = this.gameState.buildMove(this.gesture.selectedPiece, destination)
            this.gesture.selectedPiece.dragPosition = destination
            this.onCommitAttempt(move)
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
