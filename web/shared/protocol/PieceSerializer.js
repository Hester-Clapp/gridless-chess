import { Pawn, Knight, Bishop, Rook, Queen, King } from "../entity/Piece.js"

// Piece subclasses, keyed by the lowercase type string Piece.type derives
// from its constructor name (see Piece.js) - the same string round-trips
// back into the right class here.
const PIECE_TYPES = {
    pawn: Pawn,
    knight: Knight,
    bishop: Bishop,
    rook: Rook,
    queen: Queen,
    king: King,
}

// Piece <-> plain JSON, for crossing the websocket boundary. moveSet is
// deliberately omitted - it's derived deterministically from type/colour by
// each subclass's constructor, so fromJSON() reconstructs it for free.
// dragPosition (client-only drag UI state) and value (unused outside a
// hypothetical scoring feature) are omitted too - neither belongs on the wire.
export const PieceSerializer = {
    toJSON(piece) {
        return {
            id: piece.id,
            type: piece.type,
            x: piece.position.x,
            y: piece.position.y,
            white: piece.white,
            hasMoved: piece.hasMoved,
        }
    },

    fromJSON(json) {
        const Type = PIECE_TYPES[json.type]
        const piece = new Type(json.x, json.y, json.white)
        piece.id = json.id
        piece.hasMoved = json.hasMoved
        return piece
    },
}
