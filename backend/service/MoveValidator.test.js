import { assertEquals, assertStrictEquals } from "@std/assert"
import { Line } from "../../web/shared/entity/geometry/Line.js"
import { MoveValidator } from "./MoveValidator.js"

// Stand-ins, in the style of MoveExecutionService.test.js - a real
// MoveCalculator/Game aren't needed to exercise validate()'s own logic.
const makeGame = (isTurn = true) => ({ isTurn: () => isTurn })

const makeMoveCalculator = (lines) => ({
    calculateMoves: () => lines,
    closestLegalPoint(givenLines, point) {
        let closest = null
        let closestDistance = Infinity
        for (const line of givenLines) {
            const distance = line.distanceTo(point)
            if (distance < closestDistance) {
                closestDistance = distance
                closest = line.closestPoint(point)
            }
        }
        return closest
    },
})

Deno.test("validate() rejects without consulting move lines when it isn't the piece's turn", () => {
    let consulted = false
    const moveCalculator = { calculateMoves: () => { consulted = true; return [] } }
    const validator = new MoveValidator(moveCalculator)

    const result = validator.validate(makeGame(false), {}, { x: 0, y: 0 })

    assertEquals(result, { legal: false, reason: "not-your-turn" })
    assertEquals(consulted, false)
})

Deno.test("validate() accepts a position exactly on a legal move line", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const validator = new MoveValidator(makeMoveCalculator([line]))

    const result = validator.validate(makeGame(), {}, { x: 50, y: 0 })

    assertEquals(result, { legal: true, position: { x: 50, y: 0 } })
})

Deno.test("validate() accepts a position within tolerance of a legal move line", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const validator = new MoveValidator(makeMoveCalculator([line]))

    const result = validator.validate(makeGame(), {}, { x: 50, y: 0.5 })

    assertStrictEquals(result.legal, true)
    assertEquals(result.position, { x: 50, y: 0 }) // snapped back onto the line
})

Deno.test("validate() rejects a position far from every legal move line", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const validator = new MoveValidator(makeMoveCalculator([line]))

    const result = validator.validate(makeGame(), {}, { x: 50, y: 500 })

    assertEquals(result, { legal: false, reason: "illegal-move" })
})

Deno.test("validate() rejects when the piece has no legal moves at all", () => {
    const validator = new MoveValidator(makeMoveCalculator([]))

    const result = validator.validate(makeGame(), {}, { x: 0, y: 0 })

    assertEquals(result, { legal: false, reason: "illegal-move" })
})
