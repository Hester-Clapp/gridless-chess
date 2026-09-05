import { assertEquals, assertStrictEquals } from "@std/assert"
import { RADIUS } from "../entity/geometry/constants.js"
import { CaptureService } from "./CaptureService.js"

const makePiece = (x, y, white) => ({ position: { x, y }, white })

// A board-shaped stub with real (mutable) pieces.white/black arrays, since
// resolveCaptures() splices the enemy list directly rather than going
// through getEnemyPieces() (which hands back a copy). getKing() mirrors
// Board's real implementation, since getWinner() depends on it.
const makeBoard = (white = [], black = []) => ({
    pieces: { white, black },
    getKing(isWhite) {
        return (isWhite ? white : black).find(piece => piece.type === "king")
    }
})

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

Deno.test("getWinner() is null while both kings are on the board", () => {
    const board = makeBoard(
        [{ ...makePiece(0, 0, true), type: "king" }],
        [{ ...makePiece(4, 4, false), type: "king" }]
    )

    assertEquals(new CaptureService().getWinner(board), null)
})

Deno.test("getWinner() is true (white) once black's king is gone", () => {
    const board = makeBoard(
        [{ ...makePiece(0, 0, true), type: "king" }],
        []
    )

    assertStrictEquals(new CaptureService().getWinner(board), true)
})

Deno.test("getWinner() is false (black) once white's king is gone", () => {
    const board = makeBoard(
        [],
        [{ ...makePiece(4, 4, false), type: "king" }]
    )

    assertStrictEquals(new CaptureService().getWinner(board), false)
})

Deno.test("intersects() is false exactly at the combined-radius boundary and true just beyond it", () => {
    const service = new CaptureService()
    const a = makePiece(0, 0, true)

    assertStrictEquals(service.intersects(a, makePiece(RADIUS * 2, 0, false)), false)
    assertStrictEquals(service.intersects(a, makePiece(RADIUS * 2 - 1, 0, false)), true)
})
