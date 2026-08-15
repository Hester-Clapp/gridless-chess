import { SPACE, HALF_SPACE } from "./geometry/constants.js"
import { Queen } from "./Piece.js"

export class Board {
    width
    height
    pieces = {
        white: [],
        black: []
    }

    constructor() {
        this.width = 8 * SPACE
        this.height = 8 * SPACE
    }

    addPiece(Type, x, y) {
        const whitePiece = new Type(x * SPACE + HALF_SPACE, this.height - y * SPACE - HALF_SPACE, true)
        const blackPiece = new Type(x * SPACE + HALF_SPACE, y * SPACE + HALF_SPACE, false)
        this.pieces.white.push(whitePiece)
        this.pieces.black.push(blackPiece)
    }

    // All pieces, both colours, for callers like the Renderer that don't
    // care about ownership.
    getAllPieces() {
        return [...this.pieces.white, ...this.pieces.black]
    }

    // All pieces, both colours, excluding the piece given
    getOtherPieces(piece) {
        return [...this.pieces.white, ...this.pieces.black].filter(v => v !== piece)
    }

    getFriendlyPieces(piece) {
        return piece.white ? this.pieces.white.filter(v => v !== piece) : this.pieces.black.filter(v => v !== piece)
    }

    getEnemyPieces(piece) {
        return piece.white ? [...this.pieces.black] : [...this.pieces.white]
    }

    // The king of the given colour, or undefined if it's already been
    // captured (kept as a lookup rather than tracked separately, since a
    // captured king just falls out of pieces.white/black like anything else).
    getKing(white) {
        return (white ? this.pieces.white : this.pieces.black).find(piece => piece.type === "king")
    }
}
