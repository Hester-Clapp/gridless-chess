import { Pawn, Knight, Bishop, Rook, Queen, King } from "../../web/shared/entity/Piece.js"
import { SPACE, HALF_SPACE } from "../../web/shared/entity/geometry/constants.js"
import { Vector } from "../../web/shared/entity/geometry/Vector.js"

// How far a piece typically strays from its exact square when the board is
// laid out - the standard deviation of the nudge each one gets. Pieces move
// by arbitrary amounts in this variant, so starting them on a perfectly
// rigid grid would be a lie about the game from the very first move.
const DEVIATION = 0.08 * SPACE

// Lays out the standard chess starting position. Kept apart from Board
// itself - which only knows how to hold and find pieces - because both what
// the opening position looks like and how far off its squares it sits are
// rules about setting a game up, not properties of a board.
export class BoardSetupService {
    deviation

    // Pass 0 for an exact grid - useful anywhere the arithmetic matters more
    // than the feel of the thing, tests especially.
    constructor(deviation = DEVIATION) {
        this.deviation = deviation
    }

    standardSetup(board) {
        this.placePair(board, Rook, 0, 0)
        this.placePair(board, Knight, 1, 0)
        this.placePair(board, Bishop, 2, 0)
        this.placePair(board, Queen, 3, 0)
        this.placePair(board, King, 4, 0)
        this.placePair(board, Bishop, 5, 0)
        this.placePair(board, Knight, 6, 0)
        this.placePair(board, Rook, 7, 0)
        for (let i = 0; i < 8; i++) this.placePair(board, Pawn, i, 1)
    }

    // Builds a mirrored white/black pair of Type at grid square (x, y), each
    // nudged off it separately - the two colours' openings aren't reflections
    // of each other, only their squares are - then hands them to the board
    // to store.
    placePair(board, Type, x, y) {
        const base = {
            x: x * SPACE + HALF_SPACE,
            y: y * SPACE + HALF_SPACE
        }
        const whitePosition = this.nudge(base)
        const blackPosition = this.nudge(base)
        board.addPiece(new Type(whitePosition.x, board.height - whitePosition.y, true))
        board.addPiece(new Type(blackPosition.x, blackPosition.y, false))
    }

    // `point` moved a small random distance in a random direction.
    nudge(point) {
        return Vector.random(this.deviation).translate(point)
    }
}
