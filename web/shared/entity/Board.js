import { SPACE } from "./geometry/constants.js"
import { Circle } from "./geometry/Circle.js"

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

    // Adds an already-constructed piece to the board's collection for its
    // colour. Working out where that piece should sit - mirroring, opening
    // layout, random deviation - is a setup concern, not a board one; see
    // BoardSetupService.
    addPiece(piece) {
        const collection = piece.white ? this.pieces.white : this.pieces.black
        collection.push(piece)
    }

    // Takes a piece off the board, whether it was there or not. Deciding
    // that it should come off - that a move captured it - belongs to
    // whoever commits the move; see MoveExecutionService.
    removePiece(piece) {
        const collection = piece.white ? this.pieces.white : this.pieces.black
        const index = collection.indexOf(piece)
        if (index !== -1) collection.splice(index, 1)
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

    getKing(white) {
        return (white ? this.pieces.white : this.pieces.black).find(piece => piece.type === "king")
    }

    getPieceAt(point) {
        return this.getAllPieces().find(piece => new Circle(piece.position, piece.radius).containsPoint(point))
    }

    getPieceById(id) {
        return this.getAllPieces().find(piece => piece.id === id)
    }

    mirror(point) {
        return { x: this.width - point.x, y: this.height - point.y }
    }
}
