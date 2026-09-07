import { Vector } from "./geometry/Vector.js"
import { SPACE, RADIUS } from "./geometry/constants.js"
import { MoveSet } from "./MoveSet.js"
import { MoveOption, CAPTURE } from "./MoveOption.js"

export class Piece {
    id
    position = null
    white
    radius = RADIUS
    moveSet = null
    hasMoved = false
    dragPosition = null
    value

    constructor(x, y, white, value) {
        this.id = crypto.randomUUID()
        this.position = { x, y }
        this.white = white
        this.value = value
    }

    get type() {
        return this.constructor.name.toLowerCase()
    }

    get renderPosition() {
        return this.dragPosition ?? this.position
    }

    // The directions this piece may move in right now. A getter rather than
    // the MoveSet's list directly, because a piece's own state can change
    // it - see Pawn, whose opening advance is twice as long as every later
    // one, and which therefore can't settle this in its constructor.
    get moveOptions() {
        return this.moveSet.options
    }

    get canJump() {
        return this.moveSet.canJump
    }
}

export class Pawn extends Piece {
    constructor(x, y, white) {
        super(x, y, white, 1)
        const forward = white ? -1 : 1
        // The one piece whose directions don't share a rule: it advances
        // without capturing and captures without advancing, so each
        // direction carries its own.
        this.moveSet = new MoveSet([
            new MoveOption(new Vector(0, forward), 0, SPACE, CAPTURE.FORBIDDEN),
            new MoveOption(new Vector(-1, forward), 0, SPACE, CAPTURE.REQUIRED),
            new MoveOption(new Vector(1, forward), 0, SPACE, CAPTURE.REQUIRED),
        ])
    }

    // Until it has moved, a pawn may advance two spaces instead of one. Only
    // the advance doubles - the capture diagonals never reach further than a
    // single space, first move or not.
    get moveOptions() {
        if (this.hasMoved) return this.moveSet.options
        return this.moveSet.options.map(option => option.forbidsCapture ? option.reaching(2 * SPACE) : option)
    }
}

export class Knight extends Piece {
    constructor(x, y, white) {
        super(x, y, white, 3)
        this.moveSet = MoveSet.uniform(0.8 * SPACE, SPACE, [ // Roughly \sqrt{5}
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
        super(x, y, white, 3)
        this.moveSet = MoveSet.uniform(0, 8 * SPACE, [
            new Vector(1, 1),
            new Vector(-1, 1),
            new Vector(-1, -1),
            new Vector(1, -1),
        ])
    }
}

export class Rook extends Piece {
    constructor(x, y, white) {
        super(x, y, white, 5)
        this.moveSet = MoveSet.uniform(0, 8 * SPACE, [
            new Vector(1, 0),
            new Vector(0, 1),
            new Vector(-1, 0),
            new Vector(0, -1),
        ])
    }
}

export class Queen extends Piece {
    constructor(x, y, white) {
        super(x, y, white, 9)
        this.moveSet = MoveSet.uniform(0, 8 * SPACE, [
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
        super(x, y, white, 0)
        // One space in any direction. Castling's extra two-space move isn't
        // here: it depends on where this king's rooks are and what's between
        // them, which is a board question - see CastlingService.
        this.moveSet = MoveSet.uniform(0, SPACE, [
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
