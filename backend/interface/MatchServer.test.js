import { assertEquals } from "@std/assert"
import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { makeSocket } from "./testSupport/makeSocket.js"
import { MatchServer } from "./MatchServer.js"

const makeMessageEvent = (type, payload) => ({ data: JSON.stringify({ type, payload }) })

// Stand-in for GameSessionTransport, in the style of MoveExecutionService.test.js.
const makeTransport = ({ handleMoveResult, forcedWinResult } = {}) => ({
    initCalls: [],
    handleMoveCalls: [],
    forcedWinCalls: [],
    buildInit(white) { this.initCalls.push(white); return { type: MESSAGE.INIT, payload: { white } } },
    handleMove(payload) { this.handleMoveCalls.push(payload); return handleMoveResult },
    buildForcedWin(reason) { this.forcedWinCalls.push(reason); return forcedWinResult ?? { type: MESSAGE.UPDATE, payload: { reason } } },
})

const makeGame = ({ whiteToMove = true, isOver = false } = {}) => ({
    whiteToMove,
    isOver,
    declareWinnerCalls: [],
    declareWinner(white) { this.declareWinnerCalls.push(white); this.isOver = true },
})

Deno.test("start() seats the first socket white and the second black", () => {
    const transport = makeTransport()
    const server = new MatchServer(transport, makeGame(), () => {})
    const white = makeSocket()
    const black = makeSocket()

    server.start(white, black)

    assertEquals(white.sent[0], { type: MESSAGE.INIT, payload: { white: true } })
    assertEquals(black.sent[0], { type: MESSAGE.INIT, payload: { white: false } })
    assertEquals(transport.initCalls, [true, false])
})

Deno.test("handleMessage() rejects a move from the player whose colour isn't up", () => {
    const transport = makeTransport()
    const server = new MatchServer(transport, makeGame({ whiteToMove: true }), () => {})
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    black.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(transport.handleMoveCalls.length, 0)
    assertEquals(black.sent.at(-1), { type: MESSAGE.REJECTED, payload: { reason: "not-your-turn" } })
})

Deno.test("handleMessage() broadcasts an accepted move to both connections", () => {
    const update = { type: MESSAGE.UPDATE, payload: { turn: false } }
    const transport = makeTransport({ handleMoveResult: update })
    const server = new MatchServer(transport, makeGame({ whiteToMove: true }), () => {})
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
    const server = new MatchServer(transport, makeGame({ whiteToMove: true }), () => {})
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(white.sent.at(-1), rejected)
    assertEquals(black.sent.length, 1) // only its own init, no broadcast
})

Deno.test("handleMessage() calls onGameOver once an accepted move makes the game isOver", () => {
    const update = { type: MESSAGE.UPDATE, payload: { winner: true } }
    const game = makeGame({ whiteToMove: true })
    const transport = makeTransport({ handleMoveResult: update })
    // Mirrors how GameSession -> MoveExecutionService mutates the same game
    // reference as a side effect of handling a winning move.
    const realHandleMove = transport.handleMove.bind(transport)
    transport.handleMove = payload => { game.isOver = true; return realHandleMove(payload) }

    let gameOverCalls = 0
    const server = new MatchServer(transport, game, () => { gameOverCalls++ })
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("message", makeMessageEvent(MESSAGE.MAKE_MOVE, { pieceId: "p1", position: { x: 0, y: 0 } }))

    assertEquals(gameOverCalls, 1)
})

Deno.test("handleClose() before game.isOver declares the other side winner and notifies only the survivor", () => {
    const forcedWin = { type: MESSAGE.UPDATE, payload: { reason: "disconnected" } }
    const transport = makeTransport({ forcedWinResult: forcedWin })
    const game = makeGame({ whiteToMove: true, isOver: false })
    let gameOverCalls = 0
    const server = new MatchServer(transport, game, () => { gameOverCalls++ })
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("close")

    assertEquals(game.declareWinnerCalls, [false]) // white left, so black (not-white) wins
    assertEquals(transport.forcedWinCalls, ["disconnected"])
    assertEquals(black.sent.at(-1), forcedWin)
    assertEquals(white.sent.length, 1) // only its own init - it's gone, nothing is sent to it
    assertEquals(gameOverCalls, 1)
})

Deno.test("handleClose() does nothing once the game is already over", () => {
    const transport = makeTransport()
    const game = makeGame({ whiteToMove: true, isOver: true })
    let gameOverCalls = 0
    const server = new MatchServer(transport, game, () => { gameOverCalls++ })
    const white = makeSocket()
    const black = makeSocket()
    server.start(white, black)

    white.emit("close")

    assertEquals(game.declareWinnerCalls, [])
    assertEquals(transport.forcedWinCalls, [])
    assertEquals(gameOverCalls, 0)
})
