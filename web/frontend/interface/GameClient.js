import { MESSAGE } from "../../shared/interface/MessageTypes.js"
import { BoardSerializer } from "../../shared/interface/BoardSerializer.js"
import { GameSerializer } from "./GameSerializer.js"

// The client's whole side of the socket, and the only place client-side that
// touches wire JSON: it owns the connection, decodes incoming
// {type, payload} messages into real Board/Game instances using the shared
// serializers, encodes outgoing move requests, and hands subscribers domain
// objects and typed callbacks rather than raw JSON.
//
// Push subscriptions rather than a request/response call, because a board
// update can arrive on its own schedule (an opponent's move) rather than
// only as a reply to this client's own request.
export class GameClient {
    // Opening the connection is this layer's business too - which is why the
    // scheme swap for https lives here rather than in main.js.
    static open() {
        const protocol = location.protocol === "https:" ? "wss:" : "ws:"
        return new GameClient(new WebSocket(`${protocol}//${location.host}/ws`))
    }

    constructor(socket) {
        this.socket = socket
        this.handlers = { [MESSAGE.INIT]: [], [MESSAGE.UPDATE]: [], [MESSAGE.REJECTED]: [], [MESSAGE.QUEUED]: [] }
        socket.addEventListener("message", event => this.handleMessage(event))
    }

    onInit(handler) { this.handlers[MESSAGE.INIT].push(handler) }
    onUpdate(handler) { this.handlers[MESSAGE.UPDATE].push(handler) }
    onRejected(handler) { this.handlers[MESSAGE.REJECTED].push(handler) }
    onQueued(handler) { this.handlers[MESSAGE.QUEUED].push(handler) }

    // `move` is already the payload the server expects - the piece and
    // where it goes, plus the rook move when it's a castle (see
    // GameStateService.buildMove).
    makeMove(move) {
        this.socket.send(JSON.stringify({ type: MESSAGE.MAKE_MOVE, payload: move }))
    }

    disconnect() {
        this.socket.close()
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
}
