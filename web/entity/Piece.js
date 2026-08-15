import { SPACE, RADIUS, QUARTER_PI, HALF_PI, PI, TAU, KNIGHT_ANGLE } from "./geometry/constants.js"
import { MoveSet } from "./MoveSet.js"

export class Piece {
    position = null
    white
    radius = RADIUS
    moveSet = null

    // Tracks whether this piece has ever completed a move. Only pawns care
    // about it today (their first move may cover two squares), but it's
    // kept on the base class since move history is a property of the piece,
    // not the pawn subclass.
    hasMoved = false

    // Set by the movement controller while a drag is in progress. This is
    // deliberately separate from `position` - it's a purely visual stand-in
    // so a drag can be rendered without committing anything to the board
    // until (and unless) the move is actually completed.
    dragPosition = null

    constructor(x, y, white) {
        this.position = { x, y }
        this.white = white
    }

    // Derived from the concrete subclass name (e.g. Rook -> "rook"), so
    // every subclass gets asset lookup for free without repeating itself.
    get type() {
        return this.constructor.name.toLowerCase()
    }

    // Where the piece should actually be drawn - its dragged position while
    // a drag is in progress, otherwise its real board position.
    get renderPosition() {
        return this.dragPosition ?? this.position
    }

    get assetName() {
        return `${this.type}-${this.white ? "w" : "b"}.svg`
    }
}

export class Pawn extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(SPACE, 
            white ? [
                5 * QUARTER_PI, 
                3 * HALF_PI, 
                7 * QUARTER_PI
            ]
            : [
                QUARTER_PI, 
                HALF_PI, 
                3 * QUARTER_PI
            ]
        )
    }
}

export class Knight extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(2.25 * SPACE, [ // Roughly \sqrt{5}
            KNIGHT_ANGLE, 
            HALF_PI - KNIGHT_ANGLE, 
            HALF_PI + KNIGHT_ANGLE,
            PI - KNIGHT_ANGLE, 
            PI + KNIGHT_ANGLE, 
            3 * HALF_PI - KNIGHT_ANGLE, 
            3 * HALF_PI + KNIGHT_ANGLE,
            TAU - KNIGHT_ANGLE
        ], true)
    }
}

export class Bishop extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(12 * SPACE, [
            QUARTER_PI, 
            3 * QUARTER_PI, 
            5 * QUARTER_PI, 
            7 * QUARTER_PI
        ])
    }
}

export class Rook extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(12 * SPACE, [
            0, 
            HALF_PI, 
            PI, 
            3 * HALF_PI
        ])
    }
}

export class Queen extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(12 * SPACE, [
            0,
            QUARTER_PI,
            HALF_PI,
            3 * QUARTER_PI,
            PI, 
            5 * QUARTER_PI,
            3 * HALF_PI,
            7 * QUARTER_PI
        ])
    }
}

export class King extends Piece {
    constructor(x, y, white) {
        super(x, y, white)
        this.moveSet = new MoveSet(1 * SPACE, [
            0,
            QUARTER_PI,
            HALF_PI,
            3 * QUARTER_PI,
            PI, 
            5 * QUARTER_PI,
            3 * HALF_PI,
            7 * QUARTER_PI
        ])
    }
}
