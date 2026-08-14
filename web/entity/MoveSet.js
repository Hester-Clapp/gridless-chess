import { Vector } from "./geometry/Vector.js"
import { Line } from "./geometry/Line.js"
import { SPACE, QUARTER_PI, HALF_PI, PI } from "./geometry/constants.js"

export class MoveSet {
    maxDistance
    directions = []
    canJump

    constructor(maxDistance, directions, canJump = false) {
        this.maxDistance = maxDistance
        this.directions = [...directions]
        this.canJump = canJump
    }

    createLines(from) {
        return this.directions.map(angle => {
            const to = Vector.fromAngle(this.maxDistance, angle).translate(from)
            return new Line(from, to)
        })
    }
}

export class QueenMoveSet extends MoveSet {
    constructor() {
        super()
    }
}

export class KingMoveSet extends QueenMoveSet {
    constructor() {
        super()
        this.maxDistance = SPACE
    }
}
