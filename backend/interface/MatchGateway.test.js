import { assertEquals } from "@std/assert"
import { MESSAGE } from "../../web/shared/interface/MessageTypes.js"
import { makeSocket } from "./testSupport/makeSocket.js"
import { MatchQueue } from "../service/MatchQueue.js"
import { MatchRegistry } from "../service/MatchRegistry.js"
import { MatchGateway } from "./MatchGateway.js"

// Stand-in for GameSessionFactory - counts how many independent sessions
// were built, and gives back just enough of GameSession for the real
// GameSessionTransport/MatchServer above it to seat two sockets.
const makeSessionFactory = () => ({
    created: 0,
    create() {
        this.created++
        return {
            init: () => ({ boardState: { pieces: { white: [], black: [] } }, turn: true, winner: null }),
            snapshot: () => ({ boardState: { pieces: { white: [], black: [] } }, turn: true, winner: null }),
            makeMove: () => ({ boardState: { pieces: { white: [], black: [] } }, turn: false, winner: null, movedPieceId: null }),
            forfeit: () => ({ boardState: { pieces: { white: [], black: [] } }, turn: true, winner: true }),
            findPiece: () => null,
            isOver: false,
        }
    },
})

const makeGateway = () => {
    const sessionFactory = makeSessionFactory()
    const registry = new MatchRegistry()
    const gateway = new MatchGateway(new MatchQueue(), registry, sessionFactory)
    return { gateway, registry, sessionFactory }
}

Deno.test("join() tells a lone connection it's queued and does not start a match yet", () => {
    const { gateway, registry, sessionFactory } = makeGateway()
    const a = makeSocket()

    gateway.join(a)

    assertEquals(a.sent, [{ type: MESSAGE.QUEUED, payload: {} }])
    assertEquals(sessionFactory.created, 0)
    assertEquals(registry.size, 0)
})

Deno.test("the queued message is deferred until the socket's open event if it isn't open yet", () => {
    const { gateway } = makeGateway()
    const a = makeSocket({ readyState: WebSocket.CONNECTING })

    gateway.join(a)
    assertEquals(a.sent, [])

    a.emit("open")
    assertEquals(a.sent, [{ type: MESSAGE.QUEUED, payload: {} }])
})

Deno.test("a second join() builds a match and seats the first socket white, the second black", () => {
    const { gateway, registry, sessionFactory } = makeGateway()
    const white = makeSocket()
    const black = makeSocket()

    gateway.join(white)
    gateway.join(black)

    assertEquals(sessionFactory.created, 1)
    assertEquals(registry.size, 1)
    assertEquals(white.sent.at(-1).type, MESSAGE.INIT)
    assertEquals(white.sent.at(-1).payload.white, true)
    assertEquals(black.sent.at(-1).payload.white, false)
})

Deno.test("each match is built from its own session - two matches don't share state", () => {
    const { gateway, registry, sessionFactory } = makeGateway()
    for (const socket of [makeSocket(), makeSocket(), makeSocket(), makeSocket()]) gateway.join(socket)

    assertEquals(sessionFactory.created, 2)
    assertEquals(registry.size, 2)
})

Deno.test("closing a socket while it is still queued takes it out of the running", () => {
    const { gateway, sessionFactory } = makeGateway()
    const a = makeSocket()
    const b = makeSocket()

    gateway.join(a)
    a.emit("close")
    gateway.join(b)

    assertEquals(sessionFactory.created, 0) // b is on its own now, not paired with the departed a
})

Deno.test("the registry evicts a match once one of its sockets disconnects", () => {
    const { gateway, registry } = makeGateway()
    const white = makeSocket()
    const black = makeSocket()

    gateway.join(white)
    gateway.join(black)
    white.emit("close")

    assertEquals(registry.size, 0)
    assertEquals(black.sent.at(-1).payload.reason, "disconnected")
})
