import { Pawn, Knight, Bishop, Rook, Queen, King } from "../../web/shared/entity/Piece.js"
import { SPACE, HALF_SPACE } from "../../web/shared/entity/geometry/constants.js"
import { Vector } from "../../web/shared/entity/geometry/Vector.js"

// Lays out the standard chess starting position. Kept apart from Board
// itself - which only knows how to hold and place pieces - because "what
// the opening position looks like" is a rule of standard chess, not a
// property of boards in general.
export class BoardSetupService {
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

    // Builds a mirrored white/black pair of Type at grid square (x, y),
    // each nudged by the board's deviation so pieces don't all sit on a
    // perfectly rigid grid, then hands them to the board to store.
    placePair(board, Type, x, y) {
        const base = {
            x: x * SPACE + HALF_SPACE,
            y: y * SPACE + HALF_SPACE
        }
        const whitePosition = Vector.random(board.deviation).translate(base)
        const blackPosition = Vector.random(board.deviation).translate(base)
        board.addPiece(new Type(whitePosition.x, board.height - whitePosition.y, true))
        board.addPiece(new Type(blackPosition.x, blackPosition.y, false))
    }
}
