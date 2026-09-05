import { assertEquals } from "@std/assert"
import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { makeSocket } from "./testSupport/makeSocket.js"
import { MatchRegistry } from "./MatchRegistry.js"

// Stand-in for GameSessionTransport - just enough to seat two sockets and
// let a test drive a game-over via either path.
const makeTransport = () => ({
    buildInit(white) { return { type: MESSAGE.INIT, payload: { white } } },
    handleMove() { return { type: MESSAGE.UPDATE, payload: {} } },
    buildForcedWin(reason) { return { type: MESSAGE.UPDATE, payload: { reason } } },
})

const makeGame = () => ({ whiteToMove: true, isOver: false, declareWinner(white) { this.isOver = true; this.winner = white } })

Deno.test("start() builds a session via the injected factory and seats both sockets", () => {
    const registry = new MatchRegistry(() => ({ transport: makeTransport(), game: makeGame() }))
    const white = makeSocket()
    const black = makeSocket()

    registry.start(white, black)

    assertEquals(white.sent[0], { type: MESSAGE.INIT, payload: { white: true } })
    assertEquals(black.sent[0], { type: MESSAGE.INIT, payload: { white: false } })
    assertEquals(registry.size, 1)
})

Deno.test("each start() call builds an independent session - two matches don't share state", () => {
    let built = 0
    const registry = new MatchRegistry(() => {
        built++
        return { transport: makeTransport(), game: makeGame() }
    })
    const [w1, b1, w2, b2] = [makeSocket(), makeSocket(), makeSocket(), makeSocket()]

    registry.start(w1, b1)
    registry.start(w2, b2)

    assertEquals(built, 2)
    assertEquals(registry.size, 2)
})

Deno.test("the registry evicts a match once it reports game-over via a natural win", () => {
    const game = makeGame()
    const registry = new MatchRegistry(() => ({ transport: makeTransport(), game }))
    const white = makeSocket()
    const black = makeSocket()
    registry.start(white, black)

    // Simulates the game becoming over as a side effect of handling the
    // move, the way MoveExecutionService mutates the shared game in
    // production - see MatchServer.test.js for the equivalent unit test.
    game.isOver = true
    white.emit("message", { data: JSON.stringify({ type: MESSAGE.MAKE_MOVE, payload: { pieceId: "p1", position: { x: 0, y: 0 } } }) })

    assertEquals(registry.size, 0)
})

Deno.test("the registry evicts a match once it reports game-over via a disconnect forfeit", () => {
    const registry = new MatchRegistry(() => ({ transport: makeTransport(), game: makeGame() }))
    const white = makeSocket()
    const black = makeSocket()
    registry.start(white, black)

    white.emit("close")

    assertEquals(registry.size, 0)
})
