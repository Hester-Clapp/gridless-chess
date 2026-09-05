import { assertEquals } from "@std/assert"
import { Board } from "../../web/shared/entity/Board.js"
import { Pawn } from "../../web/shared/entity/Piece.js"
import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { GameSessionTransport } from "./GameSessionTransport.js"

// Stand-in for GameSession, in the style of MoveExecutionService.test.js -
// records how it was called and lets each test control what it returns.
const makeGameSession = ({ initResult, makeMoveResult } = {}) => ({
    initCalls: 0,
    makeMoveCalls: [],
    init() { this.initCalls++; return initResult },
    makeMove(args) { this.makeMoveCalls.push(args); return makeMoveResult },
})

Deno.test("buildInit() wraps GameSession.init()'s snapshot with the color and message type", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession({ initResult: { boardState: board, turn: true, winner: null } })
    const transport = new GameSessionTransport(gameSession, board)

    const message = transport.buildInit(true)

    assertEquals(message.type, MESSAGE.INIT)
    assertEquals(message.payload.white, true)
    assertEquals(message.payload.turn, true)
    assertEquals(message.payload.winner, null)
    assertEquals(message.payload.board.pieces.white[0].id, pawn.id)
    assertEquals(gameSession.initCalls, 1)
})

Deno.test("handleMove() rejects an unknown piece id without calling GameSession.makeMove", () => {
    const board = new Board()
    const gameSession = makeGameSession()
    const transport = new GameSessionTransport(gameSession, board)

    const message = transport.handleMove({ pieceId: "missing", position: { x: 0, y: 0 } })

    assertEquals(message, { type: MESSAGE.REJECTED, payload: { reason: "unknown-piece" } })
    assertEquals(gameSession.makeMoveCalls.length, 0)
})

Deno.test("handleMove() resolves the piece by id and delegates to GameSession.makeMove", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession({
        makeMoveResult: { boardState: board, turn: false, winner: null, movedPieceId: pawn.id },
    })
    const transport = new GameSessionTransport(gameSession, board)

    const message = transport.handleMove({ pieceId: pawn.id, position: { x: 5, y: 5 } })

    assertEquals(gameSession.makeMoveCalls, [{ piece: pawn, position: { x: 5, y: 5 } }])
    assertEquals(message.type, MESSAGE.UPDATE)
    assertEquals(message.payload.movedPieceId, pawn.id)
    assertEquals(message.payload.turn, false)
})

Deno.test("handleMove() turns a rejected GameSession result into a rejected message", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession({
        makeMoveResult: { boardState: board, turn: true, winner: null, rejected: true, reason: "illegal-move" },
    })
    const transport = new GameSessionTransport(gameSession, board)

    const message = transport.handleMove({ pieceId: pawn.id, position: { x: 5, y: 5 } })

    assertEquals(message, { type: MESSAGE.REJECTED, payload: { reason: "illegal-move" } })
})

Deno.test("buildForcedWin() wraps GameSession's current snapshot with a null movedPieceId and the given reason", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession()
    gameSession.snapshot = () => ({ boardState: board, turn: false, winner: true })
    const transport = new GameSessionTransport(gameSession, board)

    const message = transport.buildForcedWin("disconnected")

    assertEquals(message.type, MESSAGE.UPDATE)
    assertEquals(message.payload.turn, false)
    assertEquals(message.payload.winner, true)
    assertEquals(message.payload.movedPieceId, null)
    assertEquals(message.payload.reason, "disconnected")
})
