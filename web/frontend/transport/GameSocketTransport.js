import { MESSAGE } from "../../shared/protocol/MessageTypes.js"
import { BoardSerializer } from "../../shared/protocol/BoardSerializer.js"
import { GameSerializer } from "../../shared/protocol/GameSerializer.js"

// The only place, client-side, that touches wire JSON. Wraps a WebSocket,
// decodes incoming {type,payload} messages into real Board/Game instances
// using the shared serializers, and encodes outgoing move requests. Callers
// (GameClient) only ever see domain objects and typed callbacks, never raw
// JSON.
export class GameSocketTransport {
    constructor(socket) {
        this.socket = socket
        this.handlers = { [MESSAGE.INIT]: [], [MESSAGE.UPDATE]: [], [MESSAGE.REJECTED]: [], [MESSAGE.QUEUED]: [] }
        socket.addEventListener("message", event => this.handleMessage(event))
    }

    on(type, handler) {
        this.handlers[type].push(handler)
    }

    handleMessage(event) {
        const { type, payload } = JSON.parse(event.data)
        const decoded = (type === MESSAGE.REJECTED || type === MESSAGE.QUEUED) ? payload : this.decodeSnapshot(payload)
        for (const handler of this.handlers[type] ?? []) handler(decoded)
    }

    // A snapshot payload (init or update) always carries board/turn/winner;
    // init additionally carries this connection's color, update its
    // movedPieceId and reason (null for a move, "disconnected" for a
    // forfeit) - all just pass through untouched onto plain fields.
    decodeSnapshot(payload) {
        const board = BoardSerializer.fromJSON(payload.board)
        const game = GameSerializer.fromJSON({ whiteToMove: payload.turn, winner: payload.winner }, board)
        return { board, game, white: payload.white, movedPieceId: payload.movedPieceId ?? null, reason: payload.reason ?? null }
    }

    sendMove(pieceId, position) {
        this.socket.send(JSON.stringify({ type: MESSAGE.MAKE_MOVE, payload: { pieceId, position } }))
    }
}
