import { Vector } from "./Vector.js"
import { Line } from "./Line.js"

// An axis-aligned rectangle. It exists for clip() - MoveCalculator needs to
// cut every move line down to the area a piece is allowed to occupy, and
// that's a question about a rectangle and a line, not about chess.
export class Rectangle {
    topLeft
    bottomRight

    constructor(topLeft, bottomRight) {
        this.topLeft = topLeft
        this.bottomRight = bottomRight
    }

    // This rectangle shrunk by `margin` on every side - how the playable
    // area is derived from the board, a piece's centre being kept one radius
    // inside each edge.
    inset(margin) {
        return new Rectangle(
            { x: this.topLeft.x + margin, y: this.topLeft.y + margin },
            { x: this.bottomRight.x - margin, y: this.bottomRight.y - margin },
        )
    }

    // The part of `line` lying inside this rectangle, or undefined when none
    // of it does. A line entirely inside is returned unchanged, so callers
    // can rely on the common case not allocating.
    clip(line) {
        const vector = Vector.between(line.from, line.to)

        // Liang-Barsky clipping: express the boundary tests as
        // p[i] * t <= q[i] and narrow t down from the full [0, 1] range.
        const p = [-vector.x, vector.x, -vector.y, vector.y]
        const q = [
            line.from.x - this.topLeft.x,
            this.bottomRight.x - line.from.x,
            line.from.y - this.topLeft.y,
            this.bottomRight.y - line.from.y
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
