import { assertEquals, assertStrictEquals } from "@std/assert"
import { MoveExecutionService } from "./MoveExecutionService.js"

// Stand-ins for moveService/captureService/promotionService that record how
// they were called and let each test control what they return, rather than
// exercising the real rules (those are covered by each service's own tests).
const makeMoveService = () => ({
    invalidated: false,
    invalidateCache() { this.invalidated = true },
})

const makeCaptureService = ({ winner = null } = {}) => ({
    resolveCaptureCalls: [],
    resolveCaptures(board, piece) { this.resolveCaptureCalls.push({ board, piece }) },
    getWinner() { return winner },
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

Deno.test("commitMove() moves the piece to the destination and marks it as having moved", () => {
    const piece = { position: { x: 0, y: 0 }, hasMoved: false }
    const moveService = makeMoveService()
    const service = new MoveExecutionService(moveService, makeCaptureService(), makePromotionService())

    service.commitMove(makeGame(), {}, piece, { x: 5, y: 5 })

    assertEquals(piece.position, { x: 5, y: 5 })
    assertEquals(piece.hasMoved, true)
})

Deno.test("commitMove() resolves captures, resolves promotion, and invalidates the move cache", () => {
    const piece = { position: { x: 0, y: 0 } }
    const board = {}
    const moveService = makeMoveService()
    const captureService = makeCaptureService()
    const promotionService = makePromotionService()
    const service = new MoveExecutionService(moveService, captureService, promotionService)

    service.commitMove(makeGame(), board, piece, { x: 5, y: 5 })

    assertEquals(captureService.resolveCaptureCalls, [{ board, piece }])
    assertEquals(promotionService.resolvePromotionCalls, [{ board, piece }])
    assertEquals(moveService.invalidated, true)
})

Deno.test("commitMove() returns the promoted piece when the moved piece promotes", () => {
    const piece = { position: { x: 0, y: 0 } }
    const queen = { position: { x: 0, y: 0 } }
    const service = new MoveExecutionService(makeMoveService(), makeCaptureService(), makePromotionService({ promotesTo: queen }))

    const result = service.commitMove(makeGame(), {}, piece, { x: 5, y: 5 })

    assertStrictEquals(result, queen)
})

Deno.test("commitMove() declares a winner instead of advancing the turn when the move wins the game", () => {
    const game = makeGame()
    const service = new MoveExecutionService(makeMoveService(), makeCaptureService({ winner: true }), makePromotionService())

    service.commitMove(game, {}, { position: { x: 0, y: 0 } }, { x: 5, y: 5 })

    assertEquals(game.winnerDeclared, true)
    assertEquals(game.turnsAdvanced, 0)
})

Deno.test("commitMove() advances the turn when no winner has been decided", () => {
    const game = makeGame()
    const service = new MoveExecutionService(makeMoveService(), makeCaptureService({ winner: null }), makePromotionService())

    service.commitMove(game, {}, { position: { x: 0, y: 0 } }, { x: 5, y: 5 })

    assertEquals(game.winnerDeclared, null)
    assertEquals(game.turnsAdvanced, 1)
})
