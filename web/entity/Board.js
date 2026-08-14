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

    // Built once per board rather than per calculateMoves() call: the
    // playable area it derives only depends on board dimensions, not piece
    // positions, so there's nothing to invalidate between calls.
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

    // getFriendlyPieces(piece) {
    //     return piece.white ? this.pieces.white.filter(v => v !== piece) : this.pieces.black.filter(v => v !== piece)
    // }

    // getEnemyPieces(piece) {
    //     return piece.white ? [...this.pieces.black] : [...this.pieces.white]
    // }

    calculateMoves(piece) {
        return this.obstructionCalculator.calculateMoves(piece)
    }
}
