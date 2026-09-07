import { assertEquals } from "@std/assert"
import { MESSAGE } from "../../web/shared/interface/MessageTypes.js"
import { makeSocket } from "./testSupport/makeSocket.js"
import { MatchServer } from "./MatchServer.js"

const makeMessageEvent = (type, payload) => ({ data: JSON.stringify({ type, payload }) })

// Stand-in for GameSessionTransport, in the style of MoveExecutionService.test.js.
// `isOver` stands in for the GameSession state the real transport reports on,
// and forfeitResult for whether that session had anything left to forfeit.
const makeTransport = ({ handleMoveResult, forfeitResult = { type: MESSAGE.UPDATE, payload: { reason: "disconnected" } }, isOver = false } = {}) => ({
    initCalls: [],
    handleMoveCalls: [],
    forfeitCalls: [],
    isOver,
    buildInit(white) { this.initCalls.push(white); return { type: MESSAGE.INIT, payload: { white } } },
    handleMove(payload) { this.handleMoveCalls.push(payload); return handleMoveResult },
    buildForfeit(white) { this.forfeitCalls.push(white); return this.isOver ? null : forfeitResult },
    isGameOver() { return this.isOver },
})

Deno.test("start() seats the first socket white and the second black", () => {
    const transport = makeTransport()
    const server = new MatchServer(transport)
    const white = makeSocket()
    const black = makeSocket()

    server.start(white, black)

    assertEquals(white.sent[0], { type: MESSAGE.INIT, payload: { white: true } })
    assertEquals(black.sent[0], { type: MESSAGE.INIT, payload: { white: false } })
    assertEquals(transport.initCalls, [true, false])
})

Deno.test("handleMessage() trusts the client: a move from the player whose colour isn't up is still applied and broadcast", () => {
    const update = { type: MESSAGE.UPDATE, payload: { turn: false } }
    const transport = makeTransport({ handleMoveResult: update })
    const server = new MatchServer(transport)
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    black.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(transport.handleMoveCalls, [{ pieceId: "p1", position: { x: 0, y: 0 } }])
    for (const socket of [white, black]) assertEquals(socket.sent.at(-1), update)
})

Deno.test("handleMessage() broadcasts an accepted move to both connections", () => {
    const update = { type: MESSAGE.UPDATE, payload: { turn: false } }
    const transport = makeTransport({ handleMoveResult: update })
    const server = new MatchServer(transport)
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(transport.handleMoveCalls, [{ pieceId: "p1", position: { x: 0, y: 0 } }])
    for (const socket of [white, black]) assertEquals(socket.sent.at(-1), update)
})

Deno.test("handleMessage() sends a rejected move only to the requester, not everyone", () => {
    const rejected = { type: MESSAGE.REJECTED, payload: { reason: "illegal-move" } }
    const transport = makeTransport({ handleMoveResult: rejected })
    const server = new MatchServer(transport)
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(white.sent.at(-1), rejected)
    assertEquals(black.sent.length, 1) // only its own init, no broadcast
})

Deno.test("handleMessage() calls onGameOver once an accepted move leaves the game over", () => {
    const update = { type: MESSAGE.UPDATE, payload: { winner: true } }
    const transport = makeTransport({ handleMoveResult: update })
    // Mirrors how GameSession -> MoveExecutionService decides the match as a
    // side effect of handling a winning move, which the transport then
    // reports through isGameOver().
    const realHandleMove = transport.handleMove.bind(transport)
    transport.handleMove = payload => { transport.isOver = true; return realHandleMove(payload) }

    let gameOverCalls = 0
    const server = new MatchServer(transport)
    server.onGameOver = () => { gameOverCalls++ }
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(gameOverCalls, 1)
})

Deno.test("handleClose() forfeits on behalf of the leaver and notifies only the survivor", () => {
    const forfeit = { type: MESSAGE.UPDATE, payload: { reason: "disconnected" } }
    const transport = makeTransport({ forfeitResult: forfeit })
    let gameOverCalls = 0
    const server = new MatchServer(transport)
    server.onGameOver = () => { gameOverCalls++ }
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("close")

    assertEquals(transport.forfeitCalls, [true]) // white left, so the session decides against white
    assertEquals(black.sent.at(-1), forfeit)
    assertEquals(white.sent.length, 1) // only its own init - it's gone, nothing is sent to it
    assertEquals(gameOverCalls, 1)
})

Deno.test("handleClose() broadcasts nothing once the session says the game is already over", () => {
    const transport = makeTransport({ isOver: true })
    let gameOverCalls = 0
    const server = new MatchServer(transport)
    server.onGameOver = () => { gameOverCalls++ }
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("close")

    assertEquals(black.sent.length, 1) // only its own init
    assertEquals(gameOverCalls, 0)
})
