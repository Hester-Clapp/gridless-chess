import { assertAlmostEquals, assertEquals } from "@std/assert"
import { Line } from "../entity/geometry/Line.js"
import { Circle } from "../entity/geometry/Circle.js"
import { ObstructionScanner } from "./ObstructionScanner.js"

// ObstructionScanner takes plain Lines and { circle, friendly } obstructions -
// no board or piece involved - so these tests build both directly rather
// than going through MoveCalculator.

Deno.test("findIntersections() returns nothing for an obstruction the line never comes near", () => {
    const scanner = new ObstructionScanner()
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const obstructions = [{ friendly: true, circle: new Circle({ x: 50, y: 100 }, 10) }]

    assertEquals(scanner.findIntersections(line, obstructions), [])
})

Deno.test("scanObstructions() trims the segment short at a friendly obstruction", () => {
    const scanner = new ObstructionScanner()
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const obstructions = [{ friendly: true, circle: new Circle({ x: 50, y: 0 }, 10) }]

    const intersections = scanner.findIntersections(line, obstructions)
    const [segment] = scanner.scanObstructions(line, intersections, 1, false)
    assertAlmostEquals(segment.to.x, 40)
})

Deno.test("scanObstructions() extends onto an enemy obstruction's far edge, then stops, when it can't jump", () => {
    const scanner = new ObstructionScanner()
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const obstructions = [{ friendly: false, circle: new Circle({ x: 50, y: 0 }, 10) }]

    const intersections = scanner.findIntersections(line, obstructions)
    const [segment] = scanner.scanObstructions(line, intersections, 1, false)
    assertAlmostEquals(segment.to.x, 60)
})

Deno.test("scanObstructions() passes straight through an enemy obstruction it's allowed to capture, when it can jump", () => {
    const scanner = new ObstructionScanner()
    const line = new Line({ x: 0, y: 0 }, { x: 100, y: 0 })
    const obstructions = [{ friendly: false, circle: new Circle({ x: 50, y: 0 }, 10) }]

    const intersections = scanner.findIntersections(line, obstructions)
    const segments = scanner.scanObstructions(line, intersections, 1, true)
    assertEquals(segments.length, 1)
    assertAlmostEquals(segments[0].to.x, 100)
})

Deno.test("scanObstructions() collapses two overlapping friendly obstructions into a single blocked region", () => {
    // Circle A spans [20, 80], circle B spans [60, 120] - they overlap over
    // [60, 80], so a jumping piece should resume once past the far edge of
    // whichever obstruction still covers that point, not right after A ends.
    const scanner = new ObstructionScanner()
    const line = new Line({ x: 0, y: 0 }, { x: 200, y: 0 })
    const obstructions = [
        { friendly: true, circle: new Circle({ x: 50, y: 0 }, 30) },
        { friendly: true, circle: new Circle({ x: 90, y: 0 }, 30) },
    ]

    const intersections = scanner.findIntersections(line, obstructions)
    const [nearSide, farSide] = scanner.scanObstructions(line, intersections, 0, true)
    assertAlmostEquals(nearSide.to.x, 20)
    assertAlmostEquals(farSide.from.x, 120)
    assertAlmostEquals(farSide.to.x, 200)
})
