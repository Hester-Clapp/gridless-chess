import { Line } from "../entity/geometry/Line.js"

export class ObstructionScanner {

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

    trimStart(line, lambda) {
        return new Line(line.normal.times(lambda).translate(line.from), line.to)
    }

    trimEnd(line, lambda) {
        return new Line(line.from, line.normal.times(lambda).translate(line.from))
    }

}
