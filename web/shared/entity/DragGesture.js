import { RADIUS } from "../entity/geometry/constants.js"
import { Circle } from "../entity/geometry/Circle.js"

const DRAG_DEAD_ZONE = RADIUS

export class DragGesture {
    selectedPiece = null
    dragLines = null
    captureTarget = null
    lastMovedPiece = null

    select(piece, dragLines) {
        this.selectedPiece = piece
        this.dragLines = dragLines
        this.captureTarget = null
    }

    updateDragPosition(position, captureTarget) {
        this.selectedPiece.dragPosition = position
        this.captureTarget = captureTarget
    }

    recordMove(piece) {
        this.selectedPiece = piece
        this.lastMovedPiece = piece
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

    snapshot() {
        return {
            selectedPiece: this.selectedPiece,
            captureTarget: this.captureTarget,
            lastMovedPiece: this.lastMovedPiece
        }
    }
}