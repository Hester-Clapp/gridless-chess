import { RADIUS } from "../entity/geometry/constants.js"
import { Circle } from "../entity/geometry/Circle.js"

const DRAG_DEAD_ZONE = RADIUS

export class DragGesture {
    selectedPiece = null
    dragLines = null
    captureTarget = null

    select(piece, dragLines) {
        this.selectedPiece = piece
        this.dragLines = dragLines
        this.captureTarget = null
    }

    updateDragPosition(position, captureTarget) {
        this.selectedPiece.dragPosition = position
        this.captureTarget = captureTarget
    }

    clear() {
        this.selectedPiece.dragPosition = null
        this.selectedPiece = null
        this.dragLines = null
        this.captureTarget = null
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
    // callers (see web/main.js) merge that in separately from what they
    // last heard from the server, not from anything tracked here.
    snapshot() {
        return {
            selectedPiece: this.selectedPiece,
            captureTarget: this.captureTarget
        }
    }
}