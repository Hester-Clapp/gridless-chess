import { RADIUS } from "../../web/shared/entity/geometry/constants.js"
import { Vector } from "../../web/shared/entity/geometry/Vector.js"

// Two pieces are treated as occupying the same spot - and so capturing one
// another - once their circles overlap, i.e. the distance between their
// centres is less than the sum of their radii. Matches the obstruction
// radius MoveCalculator already uses to decide what's capturable.
const CAPTURE_DISTANCE = RADIUS * 2

export class CaptureService {
    moveService

    constructor(moveService) {
        this.moveService = moveService
    }

    // Removes any enemy piece whose square `piece` now intersects from the
    // board. Called after a move commits - capture is a consequence of
    // where a piece ends up, not a rule about where it's allowed to go
    // (that's MoveCalculator's job, before the move happens).
    resolveCaptures(board, piece) {
        const enemyList = piece.white ? board.pieces.black : board.pieces.white
        const captured = this.findCaptureAt(board, piece)
        // const captured = enemyList.filter(enemy => this.intersects(piece, enemy))

        if (!captured) return null
        const index = enemyList.indexOf(captured)
        if (index !== -1) enemyList.splice(index, 1)

        return captured
    }

    // The king belonging to `white`, plus whichever enemy pieces currently
    // threaten it. `threats` is empty (and only then) when that player
    // isn't in check - that's what "in check" means here. Deciding this
    // means walking every enemy piece's legal moves, which is calculation
    // Game shouldn't have to own.
    getCheckStatus(board, white) {
        const king = board.getKing(white)
        const threats = king ? this.findThreateningPieces(board, king) : []
        return { king, threats }
    }

    // The colour that's won by capturing the enemy king, or null if both
    // kings are still on the board. Read straight off the board - via
    // Board.getKing() - rather than tracked separately, so this stays
    // correct no matter how a king came to be gone.
    getWinner(board) {
        if (!board.getKing(true)) return false
        if (!board.getKing(false)) return true
        return null
    }

    // Enemy pieces that could capture `piece` right now, i.e. whose legal
    // moves reach within capture distance of its square. Used to detect
    // check by calling with a king as `piece`.
    findThreateningPieces(board, piece) {
        return board.getEnemyPieces(piece).filter(enemy =>
            this.moveService.calculateMoves(enemy).some(line =>
                this.intersectsPoint(line.closestPoint(piece.position), piece)
            )
        )
    }

    findCaptureAt(board, piece, point = piece.position) {
        const enemyList = piece.white ? board.pieces.black : board.pieces.white
        const captures = enemyList
            .map(enemy => ({ enemy, distance: this.distanceFrom(point, enemy) }))
            .filter(v => v.distance < CAPTURE_DISTANCE)
            .sort((a, b) => a.distance - b.distance)
            .map(v => v.enemy)
        return captures.length > 0 ? captures[0] : null
    }

    intersects(a, b) {
        return this.intersectsPoint(a.position, b)
    }

    intersectsPoint(point, piece) {
        return this.distanceFrom(point, piece) < CAPTURE_DISTANCE
    }
    
    distanceFrom(point, piece) {
        return Vector.between(point, piece.position).length
    }
}
