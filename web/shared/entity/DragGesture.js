import { RADIUS } from "../entity/geometry/constants.js"
import { Circle } from "../entity/geometry/Circle.js"

const DRAG_DEAD_ZONE = RADIUS

export class DragGesture {
    selectedPiece = null
    dragLines = null
    captureTarget = null
    pendingPiece = null // a piece whose dragPosition is pinned to an in-flight move attempt - see release()

    select(piece, dragLines) {
        this.selectedPiece = piece
        this.dragLines = dragLines
        this.captureTarget = null
    }

    updateDragPosition(position, captureTarget) {
        this.selectedPiece.dragPosition = position
        this.captureTarget = captureTarget
    }

    // Ends the gesture on a committed move attempt without discarding where
    // the piece was dropped: the server hasn't confirmed it yet, so
    // dragPosition is left exactly where the pointer left it instead of
    // snapping back to the pre-drag spot for the moment until the real
    // update arrives. That update replaces the board/piece wholesale (see
    // GameStateService), which is what naturally retires pendingPiece -
    // revertPending() only exists for the other outcome, a REJECTED reply,
    // where no update is coming and the optimistic position has to be
    // dropped by hand.
    release() {
        this.pendingPiece = this.selectedPiece
        this.selectedPiece = null
        this.dragLines = null
        this.captureTarget = null
    }

    // True abort - no move was attempted, so the piece snaps back to its
    // real position immediately (dropped in the dead zone, or a
    // pointercancel).
    clear() {
        this.selectedPiece.dragPosition = null
        this.selectedPiece = null
        this.dragLines = null
        this.captureTarget = null
    }

    // The move release() left pending came back REJECTED - it never
    // actually happened, so let the piece render at its real position again.
    revertPending() {
        if (!this.pendingPiece) return
        this.pendingPiece.dragPosition = null
        this.pendingPiece = null
    }

    isActive() {
        return this.selectedPiece !== null && this.dragLines !== null
    }

    withinDeadZone(point, shiftHeld) {
        if (shiftHeld) return false
        return new Circle(this.selectedPiece.position, DRAG_DEAD_ZONE).containsPoint(point)
    }

    // lastMovedPiece isn't part of a gesture's own state - a move only
    // takes effect once the server's update comes back over the wire, so
    // callers (see GameScreenController.renderSnapshot) merge that in
    // separately from what GameStateService last heard from the server, not
    // from anything tracked here.
    snapshot() {
        return {
            selectedPiece: this.selectedPiece,
            captureTarget: this.captureTarget
        }
    }
}