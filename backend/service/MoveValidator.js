import { Vector } from "../../web/shared/entity/geometry/Vector.js"

// Board units of slack allowed between the position a client sends and the
// nearest point actually on a legal move line, before it's rejected as
// illegal. Movement here is continuous rather than grid-locked, so a real
// network round-trip (float rounding, serialization) can land a hair off
// the line MoveCalculator computed - but kept well inside RADIUS (32) so it
// can never be stretched into reaching a materially different destination.
const POSITION_TOLERANCE = 1

export class MoveValidator {
    constructor(moveCalculator) {
        this.moveCalculator = moveCalculator
    }

    // Legal if `position` lies on (or within tolerance of) one of `piece`'s
    // legal move lines. Reuses the same closestLegalPoint() snapping
    // MoveCalculator already does for drag input, rather than a separate
    // point-on-line check, so both paths treat "close enough" identically.
    // Returns the snapped, server-canonical position alongside the verdict
    // so callers commit the point the server actually validated, not
    // whatever the client sent.
    validate(game, piece, position) {
        if (!game.isTurn(piece)) return { legal: false, reason: "not-your-turn" }

        const legalMoves = this.moveCalculator.calculateMoves(piece)
        const closest = legalMoves.length > 0 ? this.moveCalculator.closestLegalPoint(legalMoves, position) : null

        if (!closest || Vector.between(closest, position).length > POSITION_TOLERANCE) {
            return { legal: false, reason: "illegal-move" }
        }

        return { legal: true, position: closest }
    }
}
