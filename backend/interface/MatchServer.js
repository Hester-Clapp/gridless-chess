import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { sendMessage } from "./sendMessage.js"

// Runs exactly one already-matched pair of sockets against one GameSession
// via GameSessionTransport: routes makeMove requests, authorizes whose turn
// it is, and broadcasts results to both connections. Unlike its predecessor
// (GameServer, back when there was only ever one communal game), seat
// assignment isn't this class's job any more - MatchQueue hands it two
// sockets already paired, in the order they play (first white, second
// black). This class also decides when its match is over - naturally (a
// move produces a winner) or by forfeit (one side disconnects first) - and
// reports that via onGameOver so MatchRegistry can retire it. It never
// closes a socket itself: the final winning message still has to reach
// whoever's left.
export class MatchServer {
    constructor(gameSessionTransport, game, onGameOver) {
        this.transport = gameSessionTransport
        this.game = game
        this.onGameOver = onGameOver
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

        const rejection = this.authorize(connection)
        if (rejection) return this.send(connection.socket, rejection)

        const result = this.transport.handleMove(payload)
        if (result.type === MESSAGE.REJECTED) return this.send(connection.socket, result)
        this.broadcast(result)
        if (this.game.isOver) this.onGameOver()
    }

    // A disconnect only forfeits the match if it happens before a winner was
    // already decided - otherwise this is just the losing or winning side's
    // tab closing after the fact, which isn't a second ending. Deleting the
    // closed connection before broadcasting is what makes the survivor the
    // only recipient, with no special-casing needed.
    handleClose(connection) {
        this.connections.delete(connection)
        if (this.game.isOver) return

        this.game.declareWinner(!connection.white)
        this.broadcast(this.transport.buildForcedWin("disconnected"))
        this.onGameOver()
    }

    // A connection-level check, separate from (and in addition to)
    // MoveValidator's own game.isTurn(piece) check inside GameSession: this
    // stops the player who isn't up from being routed to
    // GameSessionTransport at all. MoveValidator separately stops a
    // legitimately-authorized sender from sneaking the wrong colour's piece
    // id through.
    authorize(connection) {
        if (connection.white !== this.game.whiteToMove) {
            return { type: MESSAGE.REJECTED, payload: { reason: "not-your-turn" } }
        }
        return null
    }

    send(socket, message) {
        sendMessage(socket, message)
    }

    broadcast(message) {
        for (const { socket } of this.connections) this.send(socket, message)
    }
}
