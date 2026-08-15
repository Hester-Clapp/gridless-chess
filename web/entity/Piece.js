import { Vector } from "./geometry/Vector.js"
import { SPACE, RADIUS } from "./geometry/constants.js"
import { MoveSet } from "./MoveSet.js"

export class Piece {
    position = null
    white
    radius = RADIUS
    moveSet = null
    hasMoved = false
    dragPosition = null

    constructor(x, y, white) {
        this.position = { x, y }
        this.white = white
    }

    get type() {
        return this.constructor.name.toLowerCase()
    }

    get renderPosition() {
        return this.dragPosition ?? this.position
    }
}

export class Pawn extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        const yValue = white ? -1 : 1
        this.moveSet = new MoveSet(0, SPACE, [
                new Vector(-1, yValue),
                new Vector(0, yValue),
                new Vector(1, yValue),
            ]
        )
    }
}

export class Knight extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(0.8 * SPACE, SPACE, [ // Roughly \sqrt{5}
            new Vector(2, 1),
            new Vector(1, 2),
            new Vector(-1, 2),
            new Vector(-2, 1),
            new Vector(-2, -1),
            new Vector(-1, -2),
            new Vector(1, -2),
            new Vector(2, -1),
        ], true)
    }
}

export class Bishop extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(0, 8 * SPACE, [
            new Vector(1, 1),
            new Vector(-1, 1),
            new Vector(-1, -1),
            new Vector(1, -1),
        ])
    }
}

export class Rook extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(0, 8 * SPACE, [
            new Vector(1, 0),
            new Vector(0, 1),
            new Vector(-1, 0),
            new Vector(0, -1),
        ])
    }
}

export class Queen extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(0, 8 * SPACE, [
            new Vector(1, 0),
            new Vector(1, 1),
            new Vector(0, 1),
            new Vector(-1, 1),
            new Vector(-1, 0),
            new Vector(-1, -1),
            new Vector(0, -1),
            new Vector(1, -1),
        ])
    }
}

export class King extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(0, SPACE, [
            new Vector(1, 0),
            new Vector(1, 1),
            new Vector(0, 1),
            new Vector(-1, 1),
            new Vector(-1, 0),
            new Vector(-1, -1),
            new Vector(0, -1),
            new Vector(1, -1),
        ])
    }
}
