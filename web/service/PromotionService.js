import { RADIUS } from "../entity/geometry/constants.js"
import { Queen } from "../entity/Piece.js"

// A pawn that reaches the far edge of the board promotes to a queen -
// the only promotion this variant supports, so there's no choice to offer.
export class PromotionService {

    // Promotes `piece` in place - replacing it with a queen at the same
    // position, within board.pieces - if it's a pawn that has reached the
    // opposite edge. Returns the queen it became, or `piece` unchanged
    // otherwise, so callers can always keep using the return value.
    resolvePromotion(board, piece) {
        if (piece.type !== "pawn" || !this.hasReachedFarEdge(board, piece)) return piece

        const pieces = piece.white ? board.pieces.white : board.pieces.black
        const index = pieces.indexOf(piece)
        if (index === -1) return piece

        const queen = new Queen(piece.position.x, piece.position.y, piece.white)
        queen.hasMoved = true
        pieces[index] = queen
        return queen
    }

    // A pawn moves toward y = RADIUS (white) or y = board.height - RADIUS
    // (black) - the extremes MoveCalculator's playable area clamps it to -
    // so reaching either edge means landing on that boundary.
    hasReachedFarEdge(board, piece) {
        const edgeY = piece.white ? RADIUS : board.height - RADIUS
        return Math.abs(piece.position.y - edgeY) < 0.5
    }
}
