import { SPACE, HALF_SPACE } from "./geometry/constants.js"
import { Pawn, Knight, Bishop, Rook, Queen, King } from "./Piece.js"
import { ObstructionCalculator } from "../service/ObstructionCalculator.js"

export class Board {
    width
    height
    pieces = {
        white: [],
        black: []
    }
    moveCache = null
    obstructionCalculator

    constructor() {
        this.width = 8 * SPACE
        this.height = 8 * SPACE
        this.obstructionCalculator = new ObstructionCalculator(this)
    }

    addPiece(Type, x, y) {
        const whitePiece = new Type(x * SPACE + HALF_SPACE, this.height - y * SPACE - HALF_SPACE, true)
        const blackPiece = new Type(x * SPACE + HALF_SPACE, y * SPACE + HALF_SPACE, false)
        this.pieces.white.push(whitePiece)
        this.pieces.black.push(blackPiece)
    }

    setUp() {
        this.addPiece(Rook, 0, 0)
        this.addPiece(Knight, 1, 0)
        this.addPiece(Bishop, 2, 0)
        this.addPiece(Queen, 3, 0)
        this.addPiece(King, 4, 0)
        this.addPiece(Bishop, 5, 0)
        this.addPiece(Knight, 6, 0)
        this.addPiece(Rook, 7, 0)
        for (let i = 0; i < 8; i++) this.addPiece(Pawn, i, 1)
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

    calculateMoves(piece) {
        if (this.moveCache && this.moveCache.piece === piece) {
            return this.moveCache.moves
        }

        const moves = this.obstructionCalculator.calculateMoves(piece).filter(line => line !== undefined)
        this.moveCache = { piece, moves }
        return moves
    }

    invalidateMoveCache() {
        this.moveCache = null
    }
}
