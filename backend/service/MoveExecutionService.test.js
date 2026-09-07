import { assertEquals, assertStrictEquals } from "@std/assert"
import { MoveExecutionService } from "./MoveExecutionService.js"

// Stand-ins for the services commitMove() sequences, that record how they
// were called and let each test control what they return, rather than
// exercising the real rules (those are covered by each service's own tests).
const makeCaptureService = ({ capture = null } = {}) => ({
    findCaptureCalls: [],
    findCaptureAt(board, piece) { this.findCaptureCalls.push({ board, piece }); return capture },
})

const makePromotionService = ({ promotesTo = null } = {}) => ({
    resolvePromotionCalls: [],
    resolvePromotion(board, piece) {
        this.resolvePromotionCalls.push({ board, piece })
        return promotesTo ?? piece
    },
})

const makeGame = () => ({
    winnerDeclared: null,
    turnsAdvanced: 0,
    declareWinner(white) { this.winnerDeclared = white },
    advanceTurn() { this.turnsAdvanced++ },
})

// A board-shaped stub. Both kings are present unless a test says otherwise,
// so no move wins the game by accident.
const makeBoard = ({ whiteKing = {}, blackKing = {} } = {}) => ({
    removed: [],
    removePiece(piece) { this.removed.push(piece) },
    getKing(white) { return white ? whiteKing : blackKing },
})

const makeService = (options = {}) =>
    new MoveExecutionService(makeCaptureService(options), makePromotionService(options))

Deno.test("commitMove() moves the piece to the destination and marks it as having moved", () => {
    const piece = { position: { x: 0, y: 0 }, hasMoved: false }

    makeService().commitMove(makeGame(), makeBoard(), [{ piece, position: { x: 5, y: 5 } }])

    assertEquals(piece.position, { x: 5, y: 5 })
    assertEquals(piece.hasMoved, true)
})

Deno.test("commitMove() takes the captured piece off the board and resolves promotion", () => {
    const piece = { position: { x: 0, y: 0 } }
    const victim = { position: { x: 5, y: 5 } }
    const board = makeBoard()
    const captureService = makeCaptureService({ capture: victim })
    const promotionService = makePromotionService()
    const service = new MoveExecutionService(captureService, promotionService)

    service.commitMove(makeGame(), board, [{ piece, position: { x: 5, y: 5 } }])

    assertEquals(captureService.findCaptureCalls, [{ board, piece }])
    assertEquals(board.removed, [victim])
    assertEquals(promotionService.resolvePromotionCalls, [{ board, piece }])
})

Deno.test("commitMove() removes nothing when the move captured nothing", () => {
    const board = makeBoard()

    makeService().commitMove(makeGame(), board, [{ piece: { position: { x: 0, y: 0 } }, position: { x: 5, y: 5 } }])

    assertEquals(board.removed, [])
})

// The client decides what a castle is and where the rook lands; this only
// applies what it was handed.
Deno.test("commitMove() applies the rook move a castling move brings with it", () => {
    const king = { position: { x: 450, y: 750 }, hasMoved: false }
    const rook = { position: { x: 50, y: 750 }, hasMoved: false }

    makeService().commitMove(makeGame(), makeBoard(), [
        { piece: king, position: { x: 250, y: 750 } },
        { piece: rook, position: { x: 350, y: 750 } },
    ])

    assertEquals(rook.position, { x: 350, y: 750 })
    assertEquals(rook.hasMoved, true)
    assertEquals(king.position, { x: 250, y: 750 })
})

Deno.test("commitMove() touches no piece the move didn't name", () => {
    const rook = { position: { x: 50, y: 750 }, hasMoved: false }

    makeService().commitMove(makeGame(), makeBoard(), [{ piece: { position: { x: 450, y: 750 } }, position: { x: 350, y: 750 } }])

    assertEquals(rook.position, { x: 50, y: 750 })
    assertEquals(rook.hasMoved, false)
})

Deno.test("commitMove() returns the promoted piece when the moved piece promotes", () => {
    const queen = { position: { x: 0, y: 0 } }
    const service = makeService({ promotesTo: queen })

    const result = service.commitMove(makeGame(), makeBoard(), [{ piece: { position: { x: 0, y: 0 } }, position: { x: 5, y: 5 } }])

    assertStrictEquals(result, queen)
})

Deno.test("commitMove() declares white the winner once black's king is gone", () => {
    const game = makeGame()

    makeService().commitMove(game, makeBoard({ blackKing: null }), [{ piece: { position: { x: 0, y: 0 } }, position: { x: 5, y: 5 } }])

    assertEquals(game.winnerDeclared, true)
    assertEquals(game.turnsAdvanced, 0)
})

Deno.test("commitMove() declares black the winner once white's king is gone", () => {
    const game = makeGame()

    makeService().commitMove(game, makeBoard({ whiteKing: null }), [{ piece: { position: { x: 0, y: 0 } }, position: { x: 5, y: 5 } }])

    assertEquals(game.winnerDeclared, false)
    assertEquals(game.turnsAdvanced, 0)
})

Deno.test("commitMove() advances the turn while both kings are still on the board", () => {
    const game = makeGame()

    makeService().commitMove(game, makeBoard(), [{ piece: { position: { x: 0, y: 0 } }, position: { x: 5, y: 5 } }])

    assertEquals(game.winnerDeclared, null)
    assertEquals(game.turnsAdvanced, 1)
})
