import { MESSAGE } from "../../shared/protocol/MessageTypes.js"

// Client-side mirror of GameSession - the interface layer this connection
// talks to, sitting above GameSocketTransport. Exposes push subscriptions
// rather than a request/response call: once the server is real, a board
// update can arrive on its own schedule (an opponent's move) rather than
// only as a reply to this client's own request.
export class GameClient {
    constructor(transport) {
        this.transport = transport
        this.initHandlers = []
        this.updateHandlers = []
        this.rejectedHandlers = []
        this.queuedHandlers = []

        transport.on(MESSAGE.INIT, payload => this.initHandlers.forEach(handler => handler(payload)))
        transport.on(MESSAGE.UPDATE, payload => this.updateHandlers.forEach(handler => handler(payload)))
        transport.on(MESSAGE.REJECTED, payload => this.rejectedHandlers.forEach(handler => handler(payload)))
        transport.on(MESSAGE.QUEUED, payload => this.queuedHandlers.forEach(handler => handler(payload)))
    }

    onInit(handler) { this.initHandlers.push(handler) }
    onUpdate(handler) { this.updateHandlers.push(handler) }
    onRejected(handler) { this.rejectedHandlers.push(handler) }
    onQueued(handler) { this.queuedHandlers.push(handler) }

    makeMove(pieceId, position) {
        this.transport.sendMove(pieceId, position)
    }
}
