import { assertEquals, assertStrictEquals } from "@std/assert"
import { RADIUS } from "../entity/geometry/constants.js"
import { CaptureService } from "./CaptureService.js"

const makePiece = (x, y, white) => ({ position: { x, y }, white })

const makeBoard = (white = [], black = []) => ({ pieces: { white, black } })

Deno.test("findCaptureAt() finds an overlapping enemy piece", () => {
    const mover = makePiece(0, 0, true)
    const victim = makePiece(1, 0, false)
    const board = makeBoard([mover], [victim])

    assertStrictEquals(new CaptureService().findCaptureAt(board, mover), victim)
})

Deno.test("findCaptureAt() looks for black pieces on behalf of white movers, and vice versa", () => {
    const mover = makePiece(0, 0, false)
    const victim = makePiece(0, 0, true)
    const board = makeBoard([victim], [mover])

    assertStrictEquals(new CaptureService().findCaptureAt(board, mover), victim)
})

Deno.test("findCaptureAt() is null when every enemy piece is out of reach", () => {
    const mover = makePiece(0, 0, true)
    const board = makeBoard([mover], [makePiece(1000, 1000, false)])

    assertEquals(new CaptureService().findCaptureAt(board, mover), null)
})

Deno.test("findCaptureAt() ignores friendly pieces even when overlapping", () => {
    const mover = makePiece(0, 0, true)
    const board = makeBoard([mover, makePiece(1, 0, true)], [])

    assertEquals(new CaptureService().findCaptureAt(board, mover), null)
})

Deno.test("findCaptureAt() picks the closest of several overlapping enemies", () => {
    const mover = makePiece(0, 0, true)
    const victimA = makePiece(1, 0, false)
    const victimB = makePiece(0, 2, false)
    const board = makeBoard([mover], [victimA, victimB])

    assertStrictEquals(new CaptureService().findCaptureAt(board, mover), victimA)
})

Deno.test("findCaptureAt() answers for a point the piece hasn't reached yet, which is what a drag asks", () => {
    const mover = makePiece(0, 0, true)
    const victim = makePiece(500, 0, false)
    const board = makeBoard([mover], [victim])

    assertEquals(new CaptureService().findCaptureAt(board, mover), null)
    assertStrictEquals(new CaptureService().findCaptureAt(board, mover, { x: 499, y: 0 }), victim)
})

Deno.test("intersectsPoint() is false exactly at the combined-radius boundary and true just inside it", () => {
    const service = new CaptureService()

    assertStrictEquals(service.intersectsPoint({ x: 0, y: 0 }, makePiece(RADIUS * 2, 0, false)), false)
    assertStrictEquals(service.intersectsPoint({ x: 0, y: 0 }, makePiece(RADIUS * 2 - 1, 0, false)), true)
})
