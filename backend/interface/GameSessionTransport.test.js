import { assertEquals } from "@std/assert"
import { Board } from "../../web/shared/entity/Board.js"
import { Pawn } from "../../web/shared/entity/Piece.js"
import { MESSAGE } from "../../web/shared/interface/MessageTypes.js"
import { GameSessionTransport } from "./GameSessionTransport.js"

// Stand-in for GameSession, in the style of MoveExecutionService.test.js -
// records how it was called and lets each test control what it returns.
// `pieces` backs findPiece(), which is how the real session resolves the id
// an incoming move names.
const makeGameSession = ({ initResult, makeMoveResult, forfeitResult = null, isOver = false, pieces = [] } = {}) => ({
    initCalls: 0,
    makeMoveCalls: [],
    forfeitCalls: [],
    isOver,
    init() { this.initCalls++; return initResult },
    makeMove(args) { this.makeMoveCalls.push(args); return makeMoveResult },
    forfeit(white) { this.forfeitCalls.push(white); return forfeitResult },
    findPiece(id) { return pieces.find(piece => piece.id === id) },
})

Deno.test("buildInit() wraps GameSession.init()'s snapshot with the color and message type", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession({ initResult: { boardState: board, turn: true, winner: null } })
    const transport = new GameSessionTransport(gameSession)

    const message = transport.buildInit(true)

    assertEquals(message.type, MESSAGE.INIT)
    assertEquals(message.payload.white, true)
    assertEquals(message.payload.turn, true)
    assertEquals(message.payload.winner, null)
    assertEquals(message.payload.board.pieces.white[0].id, pawn.id)
    assertEquals(gameSession.initCalls, 1)
})

Deno.test("handleMove() rejects an unknown piece id without calling GameSession.makeMove", () => {
    const gameSession = makeGameSession()
    const transport = new GameSessionTransport(gameSession)

    const message = transport.handleMove({ moves: [{ pieceId: "missing", position: { x: 0, y: 0 } }] })

    assertEquals(message, { type: MESSAGE.REJECTED, payload: { reason: "unknown-piece" } })
    assertEquals(gameSession.makeMoveCalls.length, 0)
})

Deno.test("handleMove() rejects a move naming no pieces at all", () => {
    const gameSession = makeGameSession()

    assertEquals(new GameSessionTransport(gameSession).handleMove({ moves: [] }), { type: MESSAGE.REJECTED, payload: { reason: "unknown-piece" } })
    assertEquals(gameSession.makeMoveCalls.length, 0)
})

Deno.test("handleMove() resolves the piece by id and delegates to GameSession.makeMove", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession({
        makeMoveResult: { boardState: board, turn: false, winner: null, movedPieceId: pawn.id },
        pieces: [pawn],
    })
    const transport = new GameSessionTransport(gameSession)

    const message = transport.handleMove({ moves: [{ pieceId: pawn.id, position: { x: 5, y: 5 } }] })

    assertEquals(gameSession.makeMoveCalls, [{ moves: [{ piece: pawn, position: { x: 5, y: 5 } }] }])
    assertEquals(message.type, MESSAGE.UPDATE)
    assertEquals(message.payload.movedPieceId, pawn.id)
    assertEquals(message.payload.turn, false)
})

// A castle arrives as two piece moves in one message; both have to resolve
// before either is applied.
Deno.test("handleMove() resolves every piece a multi-piece move names", () => {
    const board = new Board()
    const king = new Pawn(450, 750, true)
    const rook = new Pawn(50, 750, true)
    for (const piece of [king, rook]) board.addPiece(piece)
    const gameSession = makeGameSession({
        makeMoveResult: { boardState: board, turn: false, winner: null, movedPieceId: king.id },
        pieces: [king, rook],
    })
    const transport = new GameSessionTransport(gameSession)

    transport.handleMove({ moves: [
        { pieceId: king.id, position: { x: 250, y: 750 } },
        { pieceId: rook.id, position: { x: 350, y: 750 } },
    ] })

    assertEquals(gameSession.makeMoveCalls, [{ moves: [
        { piece: king, position: { x: 250, y: 750 } },
        { piece: rook, position: { x: 350, y: 750 } },
    ] }])
})

Deno.test("handleMove() applies none of a multi-piece move when one of its pieces is unknown", () => {
    const board = new Board()
    const king = new Pawn(450, 750, true)
    board.addPiece(king)
    const gameSession = makeGameSession({ pieces: [king] })
    const transport = new GameSessionTransport(gameSession)

    const message = transport.handleMove({ moves: [
        { pieceId: king.id, position: { x: 250, y: 750 } },
        { pieceId: "missing", position: { x: 350, y: 750 } },
    ] })

    assertEquals(message, { type: MESSAGE.REJECTED, payload: { reason: "unknown-piece" } })
    assertEquals(gameSession.makeMoveCalls.length, 0)
})

Deno.test("buildForfeit() wraps the snapshot GameSession.forfeit() returns with a null movedPieceId and the disconnect reason", () => {
    const board = new Board()
    const pawn = new Pawn(100, 100, true)
    board.addPiece(pawn)
    const gameSession = makeGameSession({ forfeitResult: { boardState: board, turn: false, winner: true } })
    const transport = new GameSessionTransport(gameSession)

    const message = transport.buildForfeit(false)

    assertEquals(gameSession.forfeitCalls, [false])
    assertEquals(message.type, MESSAGE.UPDATE)
    assertEquals(message.payload.turn, false)
    assertEquals(message.payload.winner, true)
    assertEquals(message.payload.movedPieceId, null)
    assertEquals(message.payload.reason, "disconnected")
})

Deno.test("buildForfeit() is null when GameSession says there was nothing left to forfeit", () => {
    const gameSession = makeGameSession({ forfeitResult: null })
    const transport = new GameSessionTransport(gameSession)

    assertEquals(transport.buildForfeit(true), null)
    assertEquals(gameSession.forfeitCalls, [true])
})

Deno.test("isGameOver() reports GameSession's own view of the match", () => {
    assertEquals(new GameSessionTransport(makeGameSession({ isOver: false })).isGameOver(), false)
    assertEquals(new GameSessionTransport(makeGameSession({ isOver: true })).isGameOver(), true)
})
