import { assertAlmostEquals, assertEquals } from "@std/assert"
import { Line } from "../../shared/entity/geometry/Line.js"
import { Circle } from "../../shared/entity/geometry/Circle.js"
import { RADIUS } from "../../shared/entity/geometry/constants.js"
import { ObstructionScanner } from "./ObstructionScanner.js"

// findIntersections()/scanObstructions() take plain Lines and
// { circle, friendly } obstructions - no board or piece involved - so those
// tests build both directly rather than going through MoveCalculator.
// obstructionsNear(), which produces those obstructions in the first place,
// is the one part that needs a board.

const makeBoard = pieces => ({ getOtherPieces: piece => pieces.filter(other => other !== piece) })
const makePiece = (x, y, white) => ({ position: { x, y }, white })

Deno.test("obstructionsNear() keeps only the pieces a line could reach, nearest first", () => {
    const near = makePiece(200, 0, true)
    const far = makePiece(150, 0, true)
    const outOfReach = makePiece(1000, 0, true) // past 500 + 2 * RADIUS
    const scanner = new ObstructionScanner()
    const piece = makePiece(0, 0, true)

    const obstructions = scanner.obstructionsNear(makeBoard([near, far, outOfReach, piece]), piece, [new Line({ x: 0, y: 0 }, { x: 500, y: 0 })])

    assertEquals(obstructions.length, 2)
    assertEquals(obstructions[0].circle.centre, far.position)
    assertEquals(obstructions[1].circle.centre, near.position)
})

Deno.test("obstructionsNear() marks each obstruction friendly or not by comparing colours, and sizes it to two piece radii", () => {
    const scanner = new ObstructionScanner()
    const piece = makePiece(0, 0, true)
    const board = makeBoard([piece, makePiece(100, 0, true), makePiece(200, 0, false)])

    const [friendly, enemy] = scanner.obstructionsNear(board, piece, [new Line({ x: 0, y: 0 }, { x: 500, y: 0 })])

    assertEquals(friendly.friendly, true)
    assertEquals(enemy.friendly, false)
    assertEquals(friendly.circle.radius, RADIUS * 2)
})

Deno.test("obstructionsNear() measures reach to where a line really ends, not to any distance the move set names", () => {
    // A (2, 1)-shaped jump of maxDistance 100 ends sqrt(5) * 100 = 223.6
    // away, so a piece sitting on that landing square is within reach even
    // though it's well past 100 + 2 * RADIUS.
    const landingSquare = makePiece(200, 100, true)
    const scanner = new ObstructionScanner()
    const piece = makePiece(0, 0, true)

    const obstructions = scanner.obstructionsNear(makeBoard([piece, landingSquare]), piece, [new Line({ x: 0, y: 0 }, { x: 200, y: 100 })])

    assertEquals(obstructions.length, 1)
})

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
