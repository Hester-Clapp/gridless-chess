import { Board } from "../entity/Board.js"
import { PieceSerializer } from "./PieceSerializer.js"

// Board <-> plain JSON. width/height are omitted - Board always derives them
// from SPACE (see Board.js), so there's nothing to serialize; reconstruction
// goes through Board's own addPiece() rather than assigning board.pieces
// directly, to stay inside its public API.
export const BoardSerializer = {
    toJSON(board) {
        return {
            deviation: board.deviation,
            pieces: {
                white: board.pieces.white.map(PieceSerializer.toJSON),
                black: board.pieces.black.map(PieceSerializer.toJSON),
            },
        }
    },

    fromJSON(json) {
        const board = new Board(json.deviation)
        for (const pieceJson of json.pieces.white) board.addPiece(PieceSerializer.fromJSON(pieceJson))
        for (const pieceJson of json.pieces.black) board.addPiece(PieceSerializer.fromJSON(pieceJson))
        return board
    },
}
