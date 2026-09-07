import { assertEquals, assertStrictEquals } from "@std/assert"
import { Knight, Pawn } from "../entity/Piece.js"
import { PieceSerializer } from "./PieceSerializer.js"

Deno.test("toJSON() captures id, type, position, colour and hasMoved", () => {
    const knight = new Knight(100, 200, true)
    knight.hasMoved = true

    assertEquals(PieceSerializer.toJSON(knight), {
        id: knight.id,
        type: "knight",
        x: 100,
        y: 200,
        white: true,
        hasMoved: true,
    })
})

Deno.test("fromJSON() reconstructs the right subclass with its derived moveSet", () => {
    const json = { id: "abc", type: "knight", x: 100, y: 200, white: true, hasMoved: false }

    const piece = PieceSerializer.fromJSON(json)

    assertEquals(piece instanceof Knight, true)
    assertStrictEquals(piece.id, "abc")
    assertEquals(piece.position, { x: 100, y: 200 })
    assertStrictEquals(piece.white, true)
    assertStrictEquals(piece.moveSet.canJump, true) // derived, not carried over the wire
})

Deno.test("round-trips a piece through toJSON()/fromJSON() unchanged", () => {
    const original = new Pawn(50, 60, false)
    original.hasMoved = true

    const restored = PieceSerializer.fromJSON(PieceSerializer.toJSON(original))

    assertStrictEquals(restored.id, original.id)
    assertStrictEquals(restored.type, original.type)
    assertEquals(restored.position, original.position)
    assertStrictEquals(restored.white, original.white)
    assertStrictEquals(restored.hasMoved, original.hasMoved)
})
