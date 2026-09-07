import { RADIUS } from "../entity/geometry/constants.js"
import { Vector } from "../entity/geometry/Vector.js"

// Two pieces are treated as occupying the same spot - and so capturing one
// another - once their circles overlap, i.e. the distance between their
// centres is less than the sum of their radii. Matches the obstruction
// radius MoveCalculator uses to decide what's capturable.
const CAPTURE_DISTANCE = RADIUS * 2

// Where a capture lands: the one question about capture that both sides ask.
// The client asks it mid-drag, to highlight the piece a drop would take; the
// server asks it as it commits a move, to work out which piece to remove
// (see MoveExecutionService). Neither side's answer to what *follows* from a
// capture lives here - taking the piece off the board and deciding the match
// is the server's business, and reporting check is the client's (see
// CheckService).
export class CaptureService {

    // The enemy piece `piece` would capture by occupying `point`, or null.
    // The closest one only: landing among several enemies takes the nearest,
    // never more than one at a time.
    findCaptureAt(board, piece, point = piece.position) {
        const enemyList = piece.white ? board.pieces.black : board.pieces.white
        const captures = enemyList
            .map(enemy => ({ enemy, distance: this.distanceFrom(point, enemy) }))
            .filter(v => v.distance < CAPTURE_DISTANCE)
            .sort((a, b) => a.distance - b.distance)
            .map(v => v.enemy)
        return captures.length > 0 ? captures[0] : null
    }

    intersectsPoint(point, piece) {
        return this.distanceFrom(point, piece) < CAPTURE_DISTANCE
    }

    distanceFrom(point, piece) {
        return Vector.between(point, piece.position).length
    }
}
