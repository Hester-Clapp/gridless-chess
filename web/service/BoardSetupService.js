import { Pawn, Knight, Bishop, Rook, Queen, King } from "../entity/Piece.js"

// Lays out the standard chess starting position. Kept apart from Board
// itself - which only knows how to hold and place pieces - because "what
// the opening position looks like" is a rule of standard chess, not a
// property of boards in general.
export class BoardSetupService {
    standardSetup(board) {
        board.addPiece(Rook, 0, 0)
        board.addPiece(Knight, 1, 0)
        board.addPiece(Bishop, 2, 0)
        board.addPiece(Queen, 3, 0)
        board.addPiece(King, 4, 0)
        board.addPiece(Bishop, 5, 0)
        board.addPiece(Knight, 6, 0)
        board.addPiece(Rook, 7, 0)
        for (let i = 0; i < 8; i++) board.addPiece(Pawn, i, 1)
    }
}
