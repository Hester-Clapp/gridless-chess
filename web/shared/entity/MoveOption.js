import { Line } from "./geometry/Line.js"

// What a move along one direction is allowed to do about enemy pieces.
// Every piece but the pawn only ever uses ALLOWED; the pawn is the reason
// the other two exist.
export const CAPTURE = {
    ALLOWED: "allowed", // stop short of an enemy, or take it - the usual rule
    REQUIRED: "required", // legal only as a capture, like a pawn's diagonal
    FORBIDDEN: "forbidden", // may approach an enemy but never take it, like a pawn's advance
}

// One direction a piece may travel in, how far along it it may stop, and
// what it may do to an enemy it meets there. A piece's movement is just a
// list of these, which is what lets MoveCalculator treat every direction the
// same way instead of asking which piece it's looking at.
//
// Distances scale the direction vector rather than being lengths in their
// own right, so a knight's (2, 1) reaches sqrt(5) times as far as its
// maxDistance suggests - see MoveOption.createLine().
export class MoveOption {
    vector
    minDistance
    maxDistance
    capture
    ignores

    // `ignores` names pieces that aren't in this move's way even though they
    // stand in it - only castling has any, where the king and its rook pass
    // through each other rather than one blocking the other.
    constructor(vector, minDistance, maxDistance, capture = CAPTURE.ALLOWED, ignores = []) {
        this.vector = vector
        this.minDistance = minDistance
        this.maxDistance = maxDistance
        this.capture = capture
        this.ignores = ignores
    }

    // The same option reaching a different distance - how a pawn's opening
    // advance is built out of its ordinary one (see Pawn.moveOptions).
    reaching(maxDistance) {
        return new MoveOption(this.vector, this.minDistance, maxDistance, this.capture, this.ignores)
    }

    // The stretch of board this option covers, before anything is clipped or
    // obstructed. A non-zero minDistance leaves the near end short of
    // `origin`, which is the gap a knight leaps over.
    createLine(origin) {
        return new Line(
            this.vector.times(this.minDistance).translate(origin),
            this.vector.times(this.maxDistance).translate(origin),
        )
    }

    get requiresCapture() {
        return this.capture === CAPTURE.REQUIRED
    }

    get forbidsCapture() {
        return this.capture === CAPTURE.FORBIDDEN
    }
}
