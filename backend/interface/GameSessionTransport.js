import { MESSAGE } from "../../web/shared/interface/MessageTypes.js"
import { BoardSerializer } from "../../web/shared/interface/BoardSerializer.js"

// The only place, server-side, that touches wire JSON. Decodes an incoming
// makeMove payload into the real Piece (or Pieces, when the move is a
// castle) it names, via GameSession.findPiece, calls GameSession with those
// domain objects, then serializes the result into a message ready to send.
// GameSession itself never imports a serializer or sees raw JSON, and this
// never reaches past it into a Board or Game.
//
// The unknown-piece check below is the only rejection left on this path -
// it's decode safety (there's no Piece object to hand GameSession if the
// id doesn't resolve), not a legality check. GameSession itself now trusts
// and applies whatever move it's given - see its own comment.
export class GameSessionTransport {
    constructor(gameSession) {
        this.gameSession = gameSession
    }

    buildInit(white) {
        return { type: MESSAGE.INIT, payload: { white, ...this.serializeSnapshot(this.gameSession.init()) } }
    }

    // A move names every piece it shifts - one for an ordinary move, two for
    // a castle - and each id has to resolve into a real Piece before any of
    // it is applied, since there's nothing to hand GameSession otherwise.
    handleMove({ moves = [] }) {
        const resolved = moves.map(({ pieceId, position }) => ({ piece: this.gameSession.findPiece(pieceId), position }))
        if (resolved.length === 0 || resolved.some(({ piece }) => !piece)) {
            return { type: MESSAGE.REJECTED, payload: { reason: "unknown-piece" } }
        }

        const result = this.gameSession.makeMove({ moves: resolved })
        return { type: MESSAGE.UPDATE, payload: { ...this.serializeSnapshot(result), movedPieceId: result.movedPieceId, reason: null } }
    }

    // Builds the UPDATE a match ends on when it ends by forfeit (a
    // disconnect) rather than by a move - so there's no move result to build
    // one from, and `movedPieceId` is null. `reason` mirrors the wire field
    // a move-driven UPDATE always carries (null there, since that path
    // always means a move actually happened). Null when GameSession says
    // there was nothing to forfeit, i.e. the match was already decided.
    buildForfeit(disconnectedWhite) {
        const snapshot = this.gameSession.forfeit(disconnectedWhite)
        if (!snapshot) return null
        return { type: MESSAGE.UPDATE, payload: { ...this.serializeSnapshot(snapshot), movedPieceId: null, reason: "disconnected" } }
    }

    isGameOver() {
        return this.gameSession.isOver
    }

    serializeSnapshot({ boardState, turn, winner }) {
        return { board: BoardSerializer.toJSON(boardState), turn, winner }
    }
}
