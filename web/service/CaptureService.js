import { RADIUS } from "../entity/geometry/constants.js"

// Two pieces are treated as occupying the same spot - and so capturing one
// another - once their circles overlap, i.e. the distance between their
// centres is less than the sum of their radii. Matches the obstruction
// radius ObstructionCalculator already uses to decide what's capturable.
const CAPTURE_DISTANCE = RADIUS * 2

export class CaptureService {
    // Removes any enemy piece whose square `piece` now intersects from the
    // board. Called after a move commits - capture is a consequence of
    // where a piece ends up, not a rule about where it's allowed to go
    // (that's ObstructionCalculator's job, before the move happens).
    resolveCaptures(board, piece) {
        const enemyList = piece.white ? board.pieces.black : board.pieces.white
        const captured = enemyList.filter(enemy => this.intersects(piece, enemy))

        if (captured.length === 0) return null
        const enemy = captured[0]
        const index = enemyList.indexOf(enemy)
        if (index !== -1) enemyList.splice(index, 1)

        return enemy
    }

    // Same intersection rule as resolveCaptures(), but against a hypothetical
    // position rather than the piece's real one and without mutating the
    // board - lets the UI preview what a drag would capture before the move
    // actually commits. Returns null if the point wouldn't capture anything.
    findCaptureAt(board, piece, point) {
        const enemyList = piece.white ? board.pieces.black : board.pieces.white
        return enemyList.find(enemy => this.intersectsPoint(point, enemy)) ?? null
    }

    intersects(a, b) {
        return this.intersectsPoint(a.position, b)
    }

    intersectsPoint(point, piece) {
        const dx = point.x - piece.position.x
        const dy = point.y - piece.position.y
        return dx * dx + dy * dy < CAPTURE_DISTANCE * CAPTURE_DISTANCE
    }
}
