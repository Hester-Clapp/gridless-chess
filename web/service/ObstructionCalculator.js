import { Vector } from "../entity/geometry/Vector.js"
import { Line } from "../entity/geometry/Line.js"
import { Circle } from "../entity/geometry/Circle.js"
import { RADIUS } from "../entity/geometry/constants.js"

export class ObstructionCalculator {
    board

    constructor(board) {
        this.board = board
        this.playableArea = {
            topLeft: { x: RADIUS, y: RADIUS },
            bottomRight: { x: board.width - RADIUS, y: board.height - RADIUS },
        }
    }

    calculateMoves(piece) {
        const lines = piece.moveSet.createLines(piece.position)
        const specialRules = this.specialMoveRules(piece)
        const obstructions = this.nearbyObstructions(piece, specialRules.straightDistance)

        return lines.flatMap((line, index) => this.calculateLineMoves(line, index, specialRules, obstructions))
    }

    // A pawn's move set is [diagonal, straight, diagonal] - the first
    // and last lines are captures, only legal when they actually land
    // on an enemy piece, never as a plain move onto an empty square.
    //
    // A pawn that hasn't moved yet this game may push two squares on
    // its straight line - never diagonally, since diagonals are
    // captures and a pawn can't capture two squares away.
    specialMoveRules(piece) {
        const isPawn = piece.type === "pawn"
        const canDoubleMove = isPawn && !piece.hasMoved
        const straightDistance = canDoubleMove ? piece.moveSet.maxDistance * 2 : piece.moveSet.maxDistance

        return {
            isStraight: index => isPawn && index === 1,
            isDiagonal: index => isPawn && index !== 1,
            canDoubleMove,
            straightDistance,
            canJump: piece.moveSet.canJump,
        }
    }

    // Every other piece on the board that could plausibly obstruct a move
    // along a line up to `reachDistance` long, nearest first.
    nearbyObstructions(piece, reachDistance) {
        const obstructionRadius = RADIUS * 2
        const reach = reachDistance + obstructionRadius
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
        const { isStraight, isDiagonal, canDoubleMove, straightDistance, canJump } = specialRules

        const extended = this.extendForDoubleMove(line, isStraight(index) && canDoubleMove, straightDistance)
        const clamped = this.clamp(extended)
        const intersections = this.findIntersections(clamped, obstructions)

        // A pawn cannot move diagonally if it isn't capturing an enemy
        if (isDiagonal(index) && intersections.every(x => x.friendly)) return []

        const maxEnemyDepth = isStraight(index) ? 0 : 1 // A pawn can't capture an enemy if it is moving straight
        return this.scanObstructions(clamped, intersections, maxEnemyDepth, canJump)
    }

    // Stretch the straight line out to the double-move distance before
    // anything else sees it, so clamping and obstruction detection both
    // treat it exactly like any other move.
    extendForDoubleMove(line, shouldExtend, straightDistance) {
        if (!shouldExtend) return line
        return new Line(line.from, line.normal.times(straightDistance).translate(line.from))
    }

    // Where a clamped line crosses each nearby obstruction's circle,
    // sorted from nearest to farthest along the line.
    findIntersections(clamped, obstructions) {
        const intersections = []

        for (const obs of obstructions) {
            const result = obs.circle.intersectLine(clamped)
            if (!result) continue
            if (result.lambda1 < 0) continue
            intersections.push({ in: true, position: result.lambda1, friendly: obs.friendly })
            intersections.push({ in: false, position: result.lambda2, friendly: obs.friendly })
        }

        return intersections.sort((a, b) => a.position - b.position)
    }

    // Scan the intersections along the line, splitting it into the
    // unobstructed segments a piece can actually move through.
    scanObstructions(clamped, sortedIntersections, maxEnemyDepth, canJump) {
        const originalLength = clamped.length
        const maxFriendDepth = 0

        let friendDepth = 0
        let enemyDepth = 0
        let blocked = false
        let lastBoundary = 0
        let segments = [clamped]

        for (const intersection of sortedIntersections) {
            if (intersection.position > originalLength) break

            const change = intersection.in ? 1 : -1
            if (intersection.friendly) friendDepth += change
            else enemyDepth += change

            const lastSegment = segments[segments.length - 1]

            if ((!blocked && intersection.in && (friendDepth > maxFriendDepth || enemyDepth > maxEnemyDepth)) // If entering an obstruction
                || (!intersection.in && !canJump && enemyDepth === 0)) { // Or coming out of an enemy obstruction
                blocked = true
                segments[segments.length - 1] = this.trimEnd(lastSegment, intersection.position - lastBoundary)
                if (!canJump) return segments
            }

            if (blocked && !intersection.in && friendDepth <= maxFriendDepth && enemyDepth <= maxEnemyDepth) {
                blocked = false
                lastBoundary = intersection.position
                segments.push(this.trimStart(clamped, intersection.position))
            }
        }

        return segments
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

    trimStart(line, lambda) {
        return new Line(line.normal.times(lambda).translate(line.from), line.to)
    }

    trimEnd(line, lambda) {
        return new Line(line.from, line.normal.times(lambda).translate(line.from))
    }

}