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

        // A pawn's move set is [diagonal, straight, diagonal] - the first
        // and last lines are captures, only legal when they actually land
        // on an enemy piece, never as a plain move onto an empty square.
        const isPawn = piece.type === "pawn"
        const isStraight = index => isPawn && index === 1
        const isDiagonalCapture = index => isPawn && !isStraight(index)

        const canJump = piece.moveSet.canJump
        const obstructionRadius = RADIUS * 2

        const reach = piece.moveSet.maxDistance + obstructionRadius
        const reachSquared = reach * reach
        const toObstruction = other => {
            const dx = other.position.x - piece.position.x
            const dy = other.position.y - piece.position.y
            return { friendly: (piece.white === other.white), circle: new Circle(other.position, obstructionRadius), distanceSquared: dx * dx + dy * dy }
        }
        const nearby = list => list
            .map(toObstruction)
            .filter(({ distanceSquared }) => distanceSquared <= reachSquared)
            .sort((a, b) => a.distanceSquared - b.distanceSquared)

        const nearbyObstructions = nearby(this.board.getOtherPieces(piece))

        return lines.flatMap((line, index) => {
            const clamped = this.clamp(line)
            const originalLength = clamped.length

            const intersections = []

            for (const obs of nearbyObstructions) {
                const result = this.intersectCircle(clamped, obs.circle)
                if (!result) continue
                if (result.lambda1 < 0) continue
                intersections.push({ in: true, position: result.lambda1, friendly: obs.friendly })
                intersections.push({ in: false, position: result.lambda2, friendly: obs.friendly })
            }

            const sorted = intersections.sort((a, b) => a.position - b.position)
            let friendDepth = 0
            let enemyDepth = 0
            let blocked = false
            let lastBoundary = 0
            let segments = [clamped]

            for (const intersection of sorted) {
                if (intersection.position > originalLength) break

                const change = intersection.in ? 1 : -1
                if (intersection.friendly) friendDepth += change
                else enemyDepth += change

                const lastSegment = segments[segments.length - 1]

                if (!blocked && intersection.in && (friendDepth > 0 || enemyDepth > 1)) {
                    blocked = true
                    segments[segments.length - 1] = this.trimEnd(lastSegment, intersection.position - lastBoundary - 1)
                    if (!canJump) return segments
                }

                if (blocked && !intersection.in && (friendDepth <= 0 && enemyDepth <= 1)) {
                    blocked = false
                    lastBoundary = intersection.position
                    segments.push(this.trimStart(clamped, intersection.position + 1))
                }
            }

            return segments


            // // A pawn's diagonal never had a piece to capture, so it isn't
            // // a legal move at all - not even as far as the obstruction.
            // if (isDiagonalCapture(index) && !passedCapturableEnemy) return []

            // // Drop segments an obstruction hollowed out entirely, keeping
            // // the reachable segment(s) on the other side of it. If every
            // // segment collapsed, keep one to signal "no move" as before.
            // const nonEmpty = segments.filter(({ line }) => line.length > 0)
            // const surviving = nonEmpty.length > 0 ? nonEmpty : [segments[0]]

            // return surviving.map(({ line }) => this.clamp(line))
        })
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

    intersectCircle(line, circle) {
        const displacement = Vector.between(line.from, circle.centre)
        const dot = displacement.dot(line.normal)
        const discriminant = dot ** 2 + circle.radius ** 2 - displacement.length ** 2
        if (discriminant <= 0) return null

        const lambda1 = dot - Math.sqrt(discriminant)
        const lambda2 = dot + Math.sqrt(discriminant)
        return { lambda1, lambda2 }
    }

    // adjustSegment(line, lambda1, lambda2) {
    //     return new Line(
    //         line.normal.times(lambda1, line.length).translate(line.from),
    //         line.normal.times(lambda2, line.length).translate(line.from)
    //     )
    // }

    trimStart(line, lambda) {
        return new Line(line.normal.times(lambda).translate(line.from), line.to)
    }

    trimEnd(line, lambda) {
        return new Line(line.from, line.normal.times(lambda).translate(line.from))
    }

}