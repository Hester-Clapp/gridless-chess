import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { BoardSerializer } from "../../web/shared/protocol/BoardSerializer.js"

// The only place, server-side, that touches wire JSON. Decodes an incoming
// makeMove payload into the real Piece it names (via Board.getPieceById),
// calls GameSession exactly as it's always been called - with domain
// objects - then serializes the result into a message ready to send.
// GameSession itself never imports a serializer or sees raw JSON.
export class GameSessionTransport {
    constructor(gameSession, board) {
        this.gameSession = gameSession
        this.board = board
    }

    buildInit(white) {
        return { type: MESSAGE.INIT, payload: { white, ...this.serializeSnapshot(this.gameSession.init()) } }
    }

    handleMove({ pieceId, position }) {
        const piece = this.board.getPieceById(pieceId)
        if (!piece) return { type: MESSAGE.REJECTED, payload: { reason: "unknown-piece" } }

        const result = this.gameSession.makeMove({ piece, position })
        if (result.rejected) return { type: MESSAGE.REJECTED, payload: { reason: result.reason } }

        return { type: MESSAGE.UPDATE, payload: { ...this.serializeSnapshot(result), movedPieceId: result.movedPieceId, reason: null } }
    }

    // Builds an UPDATE off the *current* GameSession snapshot rather than a
    // move result - used when a match ends by forfeit (a disconnect), not by
    // a move, so there's no move result to build one from. `reason` mirrors
    // the wire field a move-driven UPDATE always carries (null there, since
    // that path always means a move actually happened).
    buildForcedWin(reason) {
        return { type: MESSAGE.UPDATE, payload: { ...this.serializeSnapshot(this.gameSession.snapshot()), movedPieceId: null, reason } }
    }

    serializeSnapshot({ boardState, turn, winner }) {
        return { board: BoardSerializer.toJSON(boardState), turn, winner }
    }
}
