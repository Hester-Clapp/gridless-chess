import { Board } from "../entity/Board.js"
import { PieceSerializer } from "./PieceSerializer.js"

// Board <-> plain JSON. Only the pieces travel: width/height are always
// derived from SPACE (see Board.js), and how far off their squares the
// pieces were placed is a setup-time question (see BoardSetupService) whose
// only lasting trace is the positions they already carry. Reconstruction
// goes through Board's own addPiece() rather than assigning board.pieces
// directly, to stay inside its public API.
export const BoardSerializer = {
    toJSON(board) {
        return {
            pieces: {
                white: board.pieces.white.map(PieceSerializer.toJSON),
                black: board.pieces.black.map(PieceSerializer.toJSON),
            },
        }
    },

    fromJSON(json) {
        const board = new Board()
        for (const pieceJson of json.pieces.white) board.addPiece(PieceSerializer.fromJSON(pieceJson))
        for (const pieceJson of json.pieces.black) board.addPiece(PieceSerializer.fromJSON(pieceJson))
        return board
    },
}
