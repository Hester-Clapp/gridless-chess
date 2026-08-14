import { assertEquals, assertStrictEquals } from "@std/assert"
import { RADIUS } from "../entity/geometry/constants.js"
import { CaptureService } from "./CaptureService.js"

const makePiece = (x, y, white) => ({ position: { x, y }, white })

// A board-shaped stub with real (mutable) pieces.white/black arrays, since
// resolveCaptures() splices the enemy list directly rather than going
// through getEnemyPieces() (which hands back a copy).
const makeBoard = (white = [], black = []) => ({ pieces: { white, black } })

Deno.test("resolveCaptures() removes an overlapping enemy piece from the board", () => {
    const mover = makePiece(0, 0, true)
    const victim = makePiece(1, 0, false)
    const board = makeBoard([mover], [victim])

    const captured = new CaptureService().resolveCaptures(board, mover)

    assertEquals(captured, victim)
    assertEquals(board.pieces.black, [])
    assertEquals(board.pieces.white, [mover])
})

Deno.test("resolveCaptures() captures black pieces with white movers, and vice versa", () => {
    const mover = makePiece(0, 0, false)
    const victim = makePiece(0, 0, true)
    const board = makeBoard([victim], [mover])

    new CaptureService().resolveCaptures(board, mover)

    assertEquals(board.pieces.white, [])
    assertEquals(board.pieces.black, [mover])
})

Deno.test("resolveCaptures() leaves distant enemy pieces alone", () => {
    const mover = makePiece(0, 0, true)
    const distantEnemy = makePiece(1000, 1000, false)
    const board = makeBoard([mover], [distantEnemy])

    const captured = new CaptureService().resolveCaptures(board, mover)

    assertEquals(captured, null)
    assertEquals(board.pieces.black, [distantEnemy])
})

Deno.test("resolveCaptures() ignores friendly pieces even when overlapping", () => {
    const mover = makePiece(0, 0, true)
    const friendly = makePiece(1, 0, true)
    const board = makeBoard([mover, friendly], [])

    const captured = new CaptureService().resolveCaptures(board, mover)

    assertEquals(captured, null)
    assertEquals(board.pieces.white, [mover, friendly])
})

Deno.test("resolveCaptures() only captures the closest of multiple overlapping enemies at once", () => {
    const mover = makePiece(0, 0, true)
    const victimA = makePiece(1, 0, false)
    const victimB = makePiece(0, 2, false)
    const board = makeBoard([mover], [victimA, victimB])

    const captured = new CaptureService().resolveCaptures(board, mover)

    assertEquals(captured, victimA)
    assertEquals(board.pieces.black, [victimB])
})

Deno.test("intersects() is false exactly at the combined-radius boundary and true just beyond it", () => {
    const service = new CaptureService()
    const a = makePiece(0, 0, true)

    assertStrictEquals(service.intersects(a, makePiece(RADIUS * 2, 0, false)), false)
    assertStrictEquals(service.intersects(a, makePiece(RADIUS * 2 - 1, 0, false)), true)
})
