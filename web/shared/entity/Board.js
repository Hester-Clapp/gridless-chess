import { SPACE, HALF_SPACE } from "./geometry/constants.js"
import { Vector } from "./geometry/Vector.js"
import { Circle } from "./geometry/Circle.js"

export class Board {
    width
    height
    pieces = {
        white: [],
        black: []
    }
    deviation

    constructor(deviation = 0.08 * SPACE) {
        this.width = 8 * SPACE
        this.height = 8 * SPACE
        this.deviation = deviation
    }

    addPiece(Type, x, y) {
        const base = {
            x: x * SPACE + HALF_SPACE,
            y: y * SPACE + HALF_SPACE
        }
        const whitePosition = Vector.random(this.deviation).translate(base)
        const blackPosition = Vector.random(this.deviation).translate(base)
        const whitePiece = new Type(whitePosition.x, this.height - whitePosition.y, true)
        const blackPiece = new Type(blackPosition.x, blackPosition.y, false)
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

    getKing(white) {
        return (white ? this.pieces.white : this.pieces.black).find(piece => piece.type === "king")
    }

    getPieceAt(point) {
        return this.getAllPieces().find(piece => new Circle(piece.position, piece.radius).containsPoint(point))
    }

    mirror(point) {
        return { x: this.width - point.x, y: this.height - point.y }
    }
}
