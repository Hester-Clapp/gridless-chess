// Commits a move a player has already decided on. The client is the one
// that works out what a move means - whether it's a castle, and where the
// rook goes if it is - and sends every piece it shifts, so nothing here
// re-derives any of that: it applies exactly what it was told, then deals
// with the consequences the board itself decides, which are a capture, a
// promotion, and whether the match is over.
export class MoveExecutionService {
    captureService
    promotionService

    constructor(captureService, promotionService) {
        this.captureService = captureService
        this.promotionService = promotionService
    }

    // `moves` is every piece this turn shifts and where each lands - one
    // entry for an ordinary move, two for a castle - applied as given, since
    // the server never asks whether any of it was legal. Every piece is put
    // in place before any capture is worked out, so what a piece landed on
    // is judged against the finished position rather than a half-applied
    // one. Returns the first entry's piece (or what it promoted into): the
    // move was about that one, and it's the one the board reports as having
    // moved.
    commitMove(game, board, moves) {
        for (const { piece, position } of moves) {
            piece.position = position
            piece.hasMoved = true
        }

        const resultingPieces = moves.map(({ piece }) => {
            this.resolveCapture(board, piece)
            return this.promotionService.resolvePromotion(board, piece)
        })

        const winner = this.getWinner(board)
        if (winner !== null) {
            game.declareWinner(winner)
        } else {
            game.advanceTurn()
        }

        return resultingPieces[0]
    }

    // Removes the enemy piece `piece` has landed on, if any. A capture is a
    // consequence of where a piece ends up, not a rule about where it's
    // allowed to go - which is why it's resolved here, after the move, and
    // not asked about before it.
    resolveCapture(board, piece) {
        const captured = this.captureService.findCaptureAt(board, piece)
        if (!captured) return null

        board.removePiece(captured)
        return captured
    }

    // The colour that's won by capturing the enemy king, or null if both
    // kings are still on the board. Read straight off the board rather than
    // tracked separately, so this stays correct no matter how a king came to
    // be gone.
    getWinner(board) {
        if (!board.getKing(true)) return false
        if (!board.getKing(false)) return true
        return null
    }
}
