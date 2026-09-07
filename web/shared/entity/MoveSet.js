import { MoveOption } from "./MoveOption.js"

// Everything a piece can do with the board empty: the directions it moves
// in, as MoveOptions, plus whether it clears pieces in its way instead of
// being stopped by them. What the board actually allows on top of that is
// MoveCalculator's problem, not this one's.
export class MoveSet {
    options = []
    canJump

    constructor(options, canJump = false) {
        this.options = [...options]
        this.canJump = canJump
    }

    // Every direction sharing one distance range and the ordinary capture
    // rule - the shape of every piece except the pawn, whose advance and
    // captures are different moves rather than one move in several
    // directions.
    static uniform(minDistance, maxDistance, vectors, canJump = false) {
        return new MoveSet(vectors.map(vector => new MoveOption(vector, minDistance, maxDistance)), canJump)
    }
}
