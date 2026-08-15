import { assertEquals, assertAlmostEquals, assertStrictEquals, assertThrows } from "@std/assert"
import { Line } from "../entity/geometry/Line.js"
import { Vector } from "../entity/geometry/Vector.js"
import { RADIUS } from "../entity/geometry/constants.js"
import { MoveSet } from "../entity/MoveSet.js"
import { MoveCalculator } from "./MoveCalculator.js"
import { Pawn } from "../entity/Piece.js"

// MoveCalculator derives its playable area from board.width/board.height
// in the constructor, so every instance needs a board-shaped object rather
// than null. makeBoard() also stubs the friendly/enemy lookups that
// calculateMoves() relies on.
const makeBoard = ({ width = 2000, height = 2000, friendlies = [], enemies = [] } = {}) => ({
    width,
    height,
    getOtherPieces: (piece) => [...friendlies, ...enemies].filter(v => v !== piece),
})

const makePiece = (x, y, white, moveSet) => ({ position: { x, y }, white, moveSet })

const makePawn = (x, y, white, hasMoved) => ({
    position: { x, y },
    white,
    type: "pawn",
    hasMoved,
    moveSet: new MoveSet(0, 100, [new Vector(1, 1), new Vector(1, 0), new Vector(1, -1)]),
})

// ---------------------------------------------------------------------------
// clamp()
// ---------------------------------------------------------------------------
// clamp() takes only a line; the rectangle it clips against is
// this.playableArea, computed from the board's width/height in the
// constructor. Tests override playableArea directly to exercise arbitrary
// rectangles without needing a differently-sized board per case.

Deno.test("clamp() returns the same line when fully inside the rectangle", () => {
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 10, y: 10 } }

    const line = new Line({ x: 1, y: 1 }, { x: 5, y: 1 })
    const clamped = calculator.clamp(line)
    assertEquals(clamped, line)
})

Deno.test("clamp() returns undefined when fully outside the rectangle", () => {
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: 0, y: -100 }, bottomRight: { x: 10, y: 100 } }

    const line = new Line({ x: 20, y: 0 }, { x: 30, y: 0 })
    const clamped = calculator.clamp(line)
    assertEquals(clamped, undefined)
})

Deno.test("clamp() returns undefined when a horizontal line lies entirely outside a parallel boundary", () => {
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: -100, y: -10 }, bottomRight: { x: 100, y: 10 } }

    const line = new Line({ x: 0, y: -50 }, { x: 5, y: -50 })
    const clamped = calculator.clamp(line)
    assertEquals(clamped, undefined)
})

Deno.test("clamp() clips a line that exits through one side", () => {
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: 0, y: -100 }, bottomRight: { x: 10, y: 100 } }

    const line = new Line({ x: -5, y: 0 }, { x: 5, y: 0 })
    const clamped = calculator.clamp(line)
    assertAlmostEquals(clamped.from.x, 0)
    assertAlmostEquals(clamped.from.y, 0)
    assertAlmostEquals(clamped.to.x, 5)
    assertAlmostEquals(clamped.to.y, 0)
})

Deno.test("clamp() clips a diagonal line against all four sides", () => {
    // Line from (-10, -10) to (10, 10) clamped to the box [-1, 1] x [-1, 1].
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: -1, y: -1 }, bottomRight: { x: 1, y: 1 } }

    const line = new Line({ x: -10, y: -10 }, { x: 10, y: 10 })
    const clamped = calculator.clamp(line)
    assertAlmostEquals(clamped.from.x, -1)
    assertAlmostEquals(clamped.from.y, -1)
    assertAlmostEquals(clamped.to.x, 1)
    assertAlmostEquals(clamped.to.y, 1)
})

Deno.test("clamp() touching the boundary exactly is kept, not dropped", () => {
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 10, y: 10 } }

    const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
    const clamped = calculator.clamp(line)
    assertEquals(clamped, line)
})

Deno.test("clamp() collapses to a point without dropping it when the point is inside the rectangle", () => {
    // A zero-length line (from === to) is what calculateMoves() passes
    // through when a friendly piece obstructs a move at its very start.
    const calculator = new MoveCalculator(makeBoard())
    calculator.playableArea = { topLeft: { x: 0, y: 0 }, bottomRight: { x: 10, y: 10 } }

    const point = { x: 5, y: 5 }
    const line = new Line(point, point)
    const clamped = calculator.clamp(line)
    assertEquals(clamped, line)
})

// ---------------------------------------------------------------------------
// calculateMoves()
// ---------------------------------------------------------------------------

Deno.test("calculateMoves() clamps to the board when there are no other pieces", () => {
    const board = makeBoard({ width: 1000, height: 1000 })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(900, 500, true, new MoveSet(0, 200, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    // playableArea right edge is board.width - RADIUS.
    assertAlmostEquals(move.to.x, board.width - RADIUS)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() leaves moves untouched when no pieces are within reach", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(500 + 2000, 500, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)]))

    // reach = maxDistance + RADIUS * 2 = 1128; the friendly is 2000 away.
    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.from.x, 500)
    assertAlmostEquals(move.to.x, 1500)
})

Deno.test("calculateMoves() trims a move short when a friendly piece blocks it", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(800, 500, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.to.x, 736)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() extends a move onto an enemy piece's square so it can be captured", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        enemies: [makePiece(800, 500, false, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.to.x, 864)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() only applies the nearest friendly obstruction on a direction", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [
            makePiece(800, 500, true, null), // farther
            makePiece(650, 500, true, null), // nearer, should win
        ],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.to.x, 586)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() stops immediately, skipping enemy checks, when a friendly piece obstructs at distance zero", () => {
    // Friendly circle's near edge sits exactly on the piece's own square,
    // trimming the move to a zero-length line before enemies are checked.
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(628, 500, true, null)],
        enemies: [makePiece(900, 500, false, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.from.x, 500)
    assertAlmostEquals(move.to.x, 564)
})

Deno.test("calculateMoves() handles each direction of a multi-directional move set independently", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(800, 500, true, null)], // only obstructs the +x direction
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0), new Vector(-1, 0)]))

    const [blocked, clear] = calculator.calculateMoves(piece)
    assertAlmostEquals(blocked.to.x, 736)
    // Unobstructed, but still clamped to the board's left playable edge
    // (x = RADIUS) rather than reaching the full -x move distance.
    assertAlmostEquals(clear.to.x, RADIUS)
})

// ---------------------------------------------------------------------------
// calculateMoves() with a jumping piece (moveSet.canJump, e.g. a Knight)
// ---------------------------------------------------------------------------
// A jumping piece clears an obstruction instead of stopping at it, so the
// segment on the far side of the blocking piece stays reachable too.

Deno.test("calculateMoves() lets a jumping piece land on either side of a blocking friendly piece", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(800, 500, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)], true))

    const [nearSide, farSide] = calculator.calculateMoves(piece)
    assertAlmostEquals(nearSide.from.x, 500)
    assertAlmostEquals(nearSide.to.x, 736)
    assertAlmostEquals(farSide.from.x, 864)
    assertAlmostEquals(farSide.to.x, 1500)
})

Deno.test("calculateMoves() lets a jumping piece land beyond an enemy piece it could capture", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        enemies: [makePiece(800, 500, false, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)], true))

    const [capture, beyond] = calculator.calculateMoves(piece)
    assertAlmostEquals(capture.from.x, 500)
    assertAlmostEquals(capture.to.x, 1500)
})

Deno.test("calculateMoves() still lets a jumping piece capture a lone enemy even when a second enemy sits farther out of reach", () => {
    // Only one enemy is within reach of this direction, so it stays freely
    // capturable - the count that matters is enemies actually on this path,
    // not enemies anywhere on the board.
    const board = makeBoard({
        width: 5000,
        height: 5000,
        enemies: [makePiece(800, 500, false, null), makePiece(1000, 500, false, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)], true))

    const [capture, beyond] = calculator.calculateMoves(piece)
    assertAlmostEquals(capture.from.x, 500)
    assertAlmostEquals(capture.to.x, 1500)
})

Deno.test("calculateMoves() clears two friendly pieces close enough together that their obstruction circles overlap", () => {
    // The far side of the first jump lands exactly on the first circle's
    // edge, which the second (closer-than-2*obstructionRadius-apart) piece's
    // circle also covers. That edge point isn't the piece's own square, so
    // this must not be mistaken for "another piece occupies my square".
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [
            makePiece(700, 500, true, null),
            makePiece(780, 500, true, null),
        ],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)], true))

    const [nearSide, farSide] = calculator.calculateMoves(piece)
    assertAlmostEquals(nearSide.from.x, 500)
    assertAlmostEquals(nearSide.to.x, 636)
    assertAlmostEquals(farSide.from.x, 844)
    assertAlmostEquals(farSide.to.x, 1500)
})

Deno.test("calculateMoves() lets a pawn that hasn't moved yet advance two squares straight ahead", () => {
    const board = makeBoard({ width: 5000, height: 5000 })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const [move] = calculator.calculateMoves(pawn)
    assertAlmostEquals(move.from.x, 500)
    assertAlmostEquals(move.to.x, 700)
})

Deno.test("calculateMoves() only lets a pawn that has already moved advance one square straight ahead", () => {
    const board = makeBoard({ width: 5000, height: 5000 })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, true)

    const [move] = calculator.calculateMoves(pawn)
    assertAlmostEquals(move.to.x, 600)
})

Deno.test("calculateMoves() blocks a pawn's double step short when a piece sits beyond its old single-square reach", () => {
    // At 180 away, this obstruction is outside the un-doubled reach
    // (maxDistance 100 + obstructionRadius 64 = 164), so it would be missed
    // entirely - and the pawn would wrongly sail past it to 700 - unless the
    // "nearby obstruction" search also widens for the double step.
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(680, 500, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const [move] = calculator.calculateMoves(pawn)
    assertAlmostEquals(move.to.x, 616)
})

Deno.test("calculateMoves() never extends a pawn's diagonal capture past one square, even on its first move", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        // Two squares out along the capture diagonal - out of reach for a
        // one-square diagonal, so this would only be reachable if the
        // diagonal (wrongly) got the same doubling as the straight line.
        enemies: [makePiece(500 + Math.cos(Math.PI / 4) * 200, 500 + Math.sin(Math.PI / 4) * 200, false, null)],
    })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const [diagonal] = calculator.calculateMoves(pawn)
    assertAlmostEquals(diagonal.to.x, 600)
    assertAlmostEquals(diagonal.to.y, 600)
})

// ---------------------------------------------------------------------------
// calculateMoves() when a line starts inside an obstruction
// ---------------------------------------------------------------------------
// The mover's own position can end up inside another piece's obstruction
// circle (e.g. two pieces closer together than the obstruction radius). The
// line must never be blocked by extending backward past its own `from`
// point - instead it should block right at the start and, for a jumping
// piece, resume wherever the obstruction's circle actually ends.

Deno.test("calculateMoves() blocks entirely, without reaching backward, when a non-jumping piece starts inside a friendly obstruction", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(520, 500, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.from.x, 500)
    assertAlmostEquals(move.to.x, 500)
})

Deno.test("calculateMoves() resumes a jumping piece's line at the obstruction's far edge when it starts inside it", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(520, 500, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, new MoveSet(0, 1000, [new Vector(1, 0)], true))

    const [nearSide, farSide] = calculator.calculateMoves(piece)
    // Blocked immediately at the mover's own position, never before it.
    assertAlmostEquals(nearSide.from.x, 500)
    assertAlmostEquals(nearSide.to.x, 500)
    // The line picks back up exactly where the obstruction's circle ends.
    assertAlmostEquals(farSide.from.x, 584)
    assertAlmostEquals(farSide.to.x, 1500)
})

Deno.test("calculateMoves() does not throw when a jump's line clips entirely off the board", () => {
    const board = makeBoard({
        width: 2000,
        height: 2000,
        // Any nearby piece reaches this: nearbyObstructions() considers it
        // for every direction of the move set, not just ones actually
        // heading toward it.
        friendlies: [makePiece(RADIUS + 50, RADIUS + 50, true, null)],
    })
    const calculator = new MoveCalculator(board)
    // A knight-shaped move (minDistance 0.5 * SPACE) starting at the
    // playable area's top-left corner: the (-2, -1) jump's `from` point is
    // already off the board, so the whole line clips to undefined.
    const knight = makePiece(RADIUS, RADIUS, true, new MoveSet(50, 100, [new Vector(-2, -1)], true))

    const moves = calculator.calculateMoves(knight)
    assertEquals(moves, [])
})

// ---------------------------------------------------------------------------
// calculateMoves() with a non-unit-length direction vector (e.g. a Knight's
// (2, 1)) combined with a non-zero minDistance
// ---------------------------------------------------------------------------
// nearbyObstructions() has to measure its reach out to where the line
// actually ends, not from the raw MoveSet.maxDistance scalar - a direction
// vector like (2, 1) has length sqrt(5), so a knight's real reach is over
// twice that scalar. Getting this wrong drops obstructions near the far end
// of the leap, and - because minDistance pushes the line's near end away
// from the piece's own square - near its start too.

Deno.test("calculateMoves() blocks a knight-shaped jump on a friendly piece sitting on its landing square", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        // 223.6 away from the piece - beyond maxDistance(100) + obstructionRadius(64),
        // so it would be missed entirely unless the reach also scales by the
        // direction vector's length (sqrt(5) for a (2, 1) knight jump).
        friendlies: [makePiece(700, 600, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const knight = makePiece(500, 500, true, new MoveSet(50, 100, [new Vector(2, 1)], true))

    const [move] = calculator.calculateMoves(knight)
    assertAlmostEquals(move.from.x, 600)
    assertAlmostEquals(move.from.y, 550)
    assertAlmostEquals(move.to.x, 642.7566597760053)
    assertAlmostEquals(move.to.y, 571.3783298880027)
})

Deno.test("calculateMoves() blocks a knight-shaped jump on a friendly piece overlapping the start of its line, even though the piece itself sits beyond the raw maxDistance", () => {
    // This friendly sits exactly on the boundary of the jump's real starting
    // point (minDistance out along the (2, 1) direction), covering the rest
    // of the line - but it's 175.8 away from the piece's own square, still
    // beyond maxDistance(100) + obstructionRadius(64).
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(657.2433402239947, 578.6216701119973, true, null)],
    })
    const calculator = new MoveCalculator(board)
    const knight = makePiece(500, 500, true, new MoveSet(50, 100, [new Vector(2, 1)], true))

    const [move] = calculator.calculateMoves(knight)
    // Blocked right at the line's own start - never left unobstructed as it
    // would be if the obstruction had gone undetected.
    assertAlmostEquals(move.from.x, 600)
    assertAlmostEquals(move.from.y, 550)
    assertAlmostEquals(move.to.x, 600)
    assertAlmostEquals(move.to.y, 550)
})
