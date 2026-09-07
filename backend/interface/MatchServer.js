import { MESSAGE } from "../../web/shared/interface/MessageTypes.js"
import { sendMessage } from "./sendMessage.js"

// Runs exactly one already-matched pair of sockets against one GameSession
// via GameSessionTransport: routes makeMove requests and broadcasts results
// to both connections. Each connection's seat (assigned once, below, in the
// order MatchQueue paired the sockets) is passed down with every move it
// sends, so GameSessionTransport/GameSession can tell whether it was
// actually that connection's piece and turn - see their own comments - and
// send back a REJECTED instead of applying it if not. A move that *is*
// legitimate is still trusted at face value for everything past that (no
// server-side re-derivation of legal move lines), so the two clients still
// never end up disagreeing about game state. Seat assignment isn't this
// class's job either - MatchQueue hands it two sockets already paired, in
// the order they play (first white, second black).
//
// Every question about the game itself - is it over, and does this
// disconnect end it - goes through the transport to GameSession; this class
// holds no Game or Board of its own. It reports an ending via onGameOver
// (wired by MatchRegistry) so the match can be retired, but never closes a
// socket itself: the final winning message still has to reach whoever's
// left.
export class MatchServer {
    constructor(gameSessionTransport) {
        this.transport = gameSessionTransport
        this.onGameOver = () => {} // replaced by MatchRegistry once it's tracking this match
        this.connections = new Set()
    }

    start(whiteSocket, blackSocket) {
        this.seat(whiteSocket, true)
        this.seat(blackSocket, false)
    }

    seat(socket, white) {
        const connection = { socket, white }
        this.connections.add(connection)

        this.send(socket, this.transport.buildInit(white))
        socket.addEventListener("message", event => this.handleMessage(connection, event))
        socket.addEventListener("close", () => this.handleClose(connection))
    }

    handleMessage(connection, event) {
        const { type, payload } = JSON.parse(event.data)
        if (type !== MESSAGE.MAKE_MOVE) return

        const result = this.transport.handleMove(payload)
        if (result.type === MESSAGE.REJECTED) return this.send(connection.socket, result)
        this.broadcast(result)
        if (this.transport.isGameOver()) this.onGameOver()
    }

    // A disconnect only forfeits the match if it happens before a winner was
    // already decided - otherwise this is just the losing or winning side's
    // tab closing after the fact, which isn't a second ending. That's
    // GameSession's call, reported back as a null forfeit message. Deleting
    // the closed connection before broadcasting is what makes the survivor
    // the only recipient, with no special-casing needed.
    handleClose(connection) {
        this.connections.delete(connection)

        const forfeit = this.transport.buildForfeit(connection.white)
        if (!forfeit) return

        this.broadcast(forfeit)
        this.onGameOver()
    }

    send(socket, message) {
        sendMessage(socket, message)
    }

    broadcast(message) {
        for (const { socket } of this.connections) this.send(socket, message)
    }
}
