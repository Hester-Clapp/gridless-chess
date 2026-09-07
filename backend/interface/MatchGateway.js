import { MESSAGE } from "../../web/shared/interface/MessageTypes.js"
import { sendMessage } from "./sendMessage.js"
import { GameSessionTransport } from "./GameSessionTransport.js"
import { MatchServer } from "./MatchServer.js"

// Where a raw socket enters the server and stops being a socket: every /ws
// connection is handed here, told it's queued, and reduced to an opaque
// connection handle for MatchQueue - which owns the ordering rule but never
// sees a socket or a message. When the queue pairs two of those handles
// back off, this builds the match they play: a fresh, fully isolated
// GameSession (from the injected factory), a GameSessionTransport to
// serialize for it, and a MatchServer to run the two sockets against it,
// registered with MatchRegistry so it can be torn down when it ends.
//
// Splitting it this way is what keeps the queue and registry free of wire
// concerns: the service layer decides who plays whom and when a match is
// finished, and everything socket-shaped stays on this side of the line.
export class MatchGateway {
    constructor(queue, registry, sessionFactory) {
        this.queue = queue
        this.registry = registry
        this.sessionFactory = sessionFactory

        this.queue.onMatch = (a, b) => this.startMatch(a, b)
    }

    // Telling the connection it's queued before it actually joins mirrors
    // the old ordering, where a socket could never be matched away before
    // hearing it was waiting.
    join(socket) {
        const connection = { socket }

        sendMessage(socket, { type: MESSAGE.QUEUED, payload: {} })
        socket.addEventListener("close", () => this.queue.leave(connection))
        this.queue.join(connection)
    }

    startMatch(a, b) {
        const transport = new GameSessionTransport(this.sessionFactory.create())
        const match = this.registry.track(new MatchServer(transport))

        match.start(a.socket, b.socket)
    }
}
