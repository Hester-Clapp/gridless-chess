import { Line } from "../../shared/entity/geometry/Line.js"
import { Circle } from "../../shared/entity/geometry/Circle.js"
import { Vector } from "../../shared/entity/geometry/Vector.js"
import { RADIUS } from "../../shared/entity/geometry/constants.js"

// Two pieces are in each other's way once their centres come within two
// radii - the same distance at which one captures the other, so an
// obstruction circle is both "can't pass through this" and "can take this".
const OBSTRUCTION_RADIUS = RADIUS * 2

export class ObstructionScanner {

    // The pieces close enough to `lines` to be worth testing against them,
    // as circles, nearest first. Reach is measured to where the lines
    // actually end rather than from any distance a move set names: a
    // direction vector needn't be a unit vector (a knight's (2, 1) is
    // sqrt(5) long), so the two can differ by a lot.
    obstructionsNear(board, piece, lines) {
        const reach = Math.max(...lines.map(line => Vector.between(piece.position, line.to).length)) + OBSTRUCTION_RADIUS
        const reachSquared = reach * reach

        const toObstruction = other => {
            const dx = other.position.x - piece.position.x
            const dy = other.position.y - piece.position.y
            return {
                piece: other,
                friendly: (piece.white === other.white),
                circle: new Circle(other.position, OBSTRUCTION_RADIUS),
                distanceSquared: dx * dx + dy * dy,
            }
        }

        return board.getOtherPieces(piece)
            .map(toObstruction)
            .filter(({ distanceSquared }) => distanceSquared <= reachSquared)
            .sort((a, b) => a.distanceSquared - b.distanceSquared)
    }

    // Where a clamped line crosses each nearby obstruction's circle,
    // sorted from nearest to farthest along the line.
    findIntersections(clamped, obstructions) {
        const intersections = []

        for (const obs of obstructions) {
            const result = obs.circle.intersectLine(clamped)
            if (!result) continue
            if (result.lambda2 < 0) continue
            if (result.lambda1 * result.lambda2 < 0) result.lambda1 = 0
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
                segments[segments.length - 1] = this.trimEnd(lastSegment, intersection.position - lastBoundary - 1e-9)
                if (!canJump) return segments
            }

            if (blocked && !intersection.in && friendDepth <= maxFriendDepth && enemyDepth <= maxEnemyDepth) {
                blocked = false
                lastBoundary = intersection.position
                segments.push(this.trimStart(clamped, intersection.position + 1e-9))
            }
        }

        return segments
    }

    trimStart(line, lambda) {
        return new Line(line.normal.times(lambda).translate(line.from), line.to)
    }

    trimEnd(line, lambda) {
        return new Line(line.from, line.normal.times(lambda).translate(line.from))
    }

}
