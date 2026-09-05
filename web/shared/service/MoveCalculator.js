import { Vector } from "../entity/geometry/Vector.js"
import { Line } from "../entity/geometry/Line.js"
import { Circle } from "../entity/geometry/Circle.js"
import { RADIUS } from "../entity/geometry/constants.js"
import { ObstructionScanner } from "./ObstructionScanner.js"

export class MoveCalculator {
    board
    moveCache = null
    scanner = new ObstructionScanner()

    constructor(board) {
        this.board = board
        this.playableArea = {
            topLeft: { x: RADIUS, y: RADIUS },
            bottomRight: { x: board.width - RADIUS, y: board.height - RADIUS },
        }
    }

    calculateMoves(piece) {
        if (this.moveCache && this.moveCache.piece === piece) {
            return this.moveCache.moves
        }

        const specialRules = this.specialMoveRules(piece)
        const lines = piece.moveSet.createLines(piece.position)
            .map((line, index) => this.extendForDoubleMove(line, specialRules.isStraight(index) && specialRules.canDoubleMove, specialRules.straightDistance))
        const obstructions = this.nearbyObstructions(piece, lines)

        const moves = lines.flatMap((line, index) => this.calculateLineMoves(line, index, specialRules, obstructions))
            .filter(line => line && line.length > 1e-6)
        this.moveCache = { piece, moves }
        return moves
    }

    // The point on any of `lines` closest to `point` - used to snap an
    // arbitrary drag position onto the nearest legal destination.
    closestLegalPoint(lines, point) {
        let closest = null
        let closestDistance = Infinity
        for (const line of lines) {
            const distance = line.distanceTo(point)
            if (distance < closestDistance) {
                closestDistance = distance
                closest = line.closestPoint(point)
            }
        }
        return closest
    }

    // The board (and any capture it caused) can change what's legal for
    // every piece, not just the one that moved, so callers drop the whole
    // cache after a move rather than trying to reason about which pieces
    // are affected.
    invalidateCache() {
        this.moveCache = null
    }

    specialMoveRules(piece) {
        const isPawn = piece.type === "pawn"
        const isKing = piece.type === "king"
        const canDoubleMove = isPawn && !piece.hasMoved
        const straightDistance = canDoubleMove ? piece.moveSet.maxDistance * 2 : piece.moveSet.maxDistance

        return {
            isStraight: index => isPawn && index === 1,
            isDiagonal: index => isPawn && index !== 1,
            // True for any direction that's a single fixed-length step rather
            // than a genuine slide: every king move, and a pawn move in any
            // direction except a straight advance it's allowed to double -
            // that one still covers two squares and has to be swept like a
            // slide so a piece on the near square can block it.
            isHop: index => isKing || (isPawn && !(index === 1 && canDoubleMove)),
            canDoubleMove,
            straightDistance,
            canJump: piece.moveSet.canJump,
        }
    }

    nearbyObstructions(piece, lines) {
        const obstructionRadius = RADIUS * 2
        const reach = Math.max(...lines.map(line => Vector.between(piece.position, line.to).length)) + obstructionRadius
        const reachSquared = reach * reach

        const toObstruction = other => {
            const dx = other.position.x - piece.position.x
            const dy = other.position.y - piece.position.y
            return { friendly: (piece.white === other.white), circle: new Circle(other.position, obstructionRadius), distanceSquared: dx * dx + dy * dy }
        }

        return this.board.getOtherPieces(piece)
            .map(toObstruction)
            .filter(({ distanceSquared }) => distanceSquared <= reachSquared)
            .sort((a, b) => a.distanceSquared - b.distanceSquared)
    }

    calculateLineMoves(line, index, specialRules, obstructions) {
        const { isStraight, isDiagonal, isHop, canJump } = specialRules

        const clamped = this.clamp(line)
        if (!clamped) return [] // The line lies entirely outside the playable area - no legal moves this way.

        if (isHop(index)) return this.hopMove(clamped, isStraight(index), isDiagonal(index), obstructions)

        const intersections = this.scanner.findIntersections(clamped, obstructions)

        // A pawn cannot move diagonally if it isn't capturing an enemy
        if (isDiagonal(index) && intersections.every(x => x.friendly)) return []

        const maxEnemyDepth = isStraight(index) ? 0 : 1 // A pawn can't capture an enemy if it is moving straight
        return this.scanner.scanObstructions(clamped, intersections, maxEnemyDepth, canJump)
    }

    // A single fixed-length step - a pawn's diagonal capture, a pawn's
    // one-square advance once it's already moved, or any king move - isn't a
    // ray to be swept for obstructions along its length; only what's sitting
    // on the destination square itself matters. Scanning the whole path (as
    // the branch above does for genuine slides) let a piece merely *near*
    // that path - most often a pawn's own file-neighbour, still standing on
    // its home square - wrongly block or truncate a move nothing was
    // actually in the way of.
    hopMove(clamped, isStraight, isDiagonal, obstructions) {
        const atDestination = obstructions.filter(o => o.circle.containsPoint(clamped.to))
        const friendlyThere = atDestination.some(o => o.friendly)

        if (friendlyThere) return [] // own piece occupies the square
        if (isStraight && atDestination.length > 0) return [] // a pawn can't capture by stepping straight ahead
        if (isDiagonal && atDestination.length === 0) return [] // a pawn can't step diagonally onto an empty square
        return [clamped]
    }

    // Stretch the straight line out to the double-move distance before
    // anything else sees it, so clamping and obstruction detection both
    // treat it exactly like any other move.
    extendForDoubleMove(line, shouldExtend, straightDistance) {
        if (!shouldExtend) return line
        return new Line(line.from, line.normal.times(straightDistance).translate(line.from))
    }

    clamp(line) {
        const { topLeft, bottomRight } = this.playableArea
        const vector = Vector.between(line.from, line.to)

        // Liang-Barsky clipping: express the boundary tests as
        // p[i] * t <= q[i] and narrow t down from the full [0, 1] range.
        const p = [-vector.x, vector.x, -vector.y, vector.y]
        const q = [
            line.from.x - topLeft.x,
            bottomRight.x - line.from.x,
            line.from.y - topLeft.y,
            bottomRight.y - line.from.y
        ]

        let t0 = 0
        let t1 = 1

        for (let i = 0; i < 4; i++) {
            if (p[i] === 0) {
                if (q[i] < 0) return undefined
                continue
            }

            const t = q[i] / p[i]
            if (p[i] < 0) {
                if (t > t0) t0 = t
            } else if (t < t1) {
                t1 = t
            }
        }

        if (t0 > t1) return undefined
        if (t0 === 0 && t1 === 1) return line

        return new Line(
            vector.times(t0).translate(line.from),
            vector.times(t1).translate(line.from)
        )
    }

}
