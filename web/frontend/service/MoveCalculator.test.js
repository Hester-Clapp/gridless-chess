import { assertAlmostEquals, assertEquals } from "@std/assert"
import { Line } from "../../shared/entity/geometry/Line.js"
import { Vector } from "../../shared/entity/geometry/Vector.js"
import { RADIUS, SPACE, HALF_SPACE } from "../../shared/entity/geometry/constants.js"
import { MoveOption, CAPTURE } from "../../shared/entity/MoveOption.js"
import { Board } from "../../shared/entity/Board.js"
import { King, Rook, Bishop } from "../../shared/entity/Piece.js"
import { MoveCalculator } from "./MoveCalculator.js"

// MoveCalculator derives its playable area from board.width/board.height
// in the constructor, so every instance needs a board-shaped object rather
// than null. makeBoard() also stubs the piece lookups that calculateMoves()
// relies on.
const makeBoard = ({ width = 2000, height = 2000, friendlies = [], enemies = [] } = {}) => ({
    width,
    height,
    getOtherPieces: (piece) => [...friendlies, ...enemies].filter(v => v !== piece),
    getFriendlyPieces: (piece) => friendlies.filter(v => v !== piece),
})

// Pieces are stubs rather than real Piece subclasses: what MoveCalculator
// needs from one is its position, colour, move options and whether it jumps.
const makePiece = (x, y, white, moveOptions = [], canJump = false) => ({ position: { x, y }, white, moveOptions, canJump })

const options = (minDistance, maxDistance, vectors, capture = CAPTURE.ALLOWED) =>
    vectors.map(vector => new MoveOption(vector, minDistance, maxDistance, capture))

// A pawn shaped like the real one (advance that can't capture, diagonals
// that must) but pointing along +x, so the arithmetic in these tests stays
// readable.
const makePawn = (x, y, white, hasMoved) => makePiece(x, y, white, [
    new MoveOption(new Vector(1, 1), 0, SPACE, CAPTURE.REQUIRED),
    new MoveOption(new Vector(1, 0), 0, hasMoved ? SPACE : 2 * SPACE, CAPTURE.FORBIDDEN),
    new MoveOption(new Vector(1, -1), 0, SPACE, CAPTURE.REQUIRED),
])

// ---------------------------------------------------------------------------
// calculateMoves()
// ---------------------------------------------------------------------------

Deno.test("calculateMoves() clips to the board when there are no other pieces", () => {
    const board = makeBoard({ width: 1000, height: 1000 })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(900, 500, true, options(0, 200, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    // playableArea right edge is board.width - RADIUS.
    assertAlmostEquals(move.to.x, board.width - RADIUS)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() leaves moves untouched when no pieces are within reach", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(500 + 2000, 500, true)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]))

    // reach = maxDistance + RADIUS * 2 = 1128; the friendly is 2000 away.
    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.from.x, 500)
    assertAlmostEquals(move.to.x, 1500)
})

Deno.test("calculateMoves() trims a move short when a friendly piece blocks it", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(800, 500, true)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.to.x, 736)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() extends a move onto an enemy piece's square so it can be captured", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        enemies: [makePiece(800, 500, false)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.to.x, 864)
    assertAlmostEquals(move.to.y, 500)
})

Deno.test("calculateMoves() only applies the nearest friendly obstruction on a direction", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [
            makePiece(800, 500, true), // farther
            makePiece(650, 500, true), // nearer, should win
        ],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]))

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
        friendlies: [makePiece(628, 500, true)],
        enemies: [makePiece(900, 500, false)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]))

    const [move] = calculator.calculateMoves(piece)
    assertAlmostEquals(move.from.x, 500)
    assertAlmostEquals(move.to.x, 564)
})

Deno.test("calculateMoves() handles each direction of a multi-directional move set independently", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(800, 500, true)], // only obstructs the +x direction
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0), new Vector(-1, 0)]))

    const [blocked, clear] = calculator.calculateMoves(piece)
    assertAlmostEquals(blocked.to.x, 736)
    // Unobstructed, but still clipped to the board's left playable edge
    // (x = RADIUS) rather than reaching the full -x move distance.
    assertAlmostEquals(clear.to.x, RADIUS)
})

// ---------------------------------------------------------------------------
// calculateMoves() with a jumping piece (canJump, e.g. a Knight)
// ---------------------------------------------------------------------------
// A jumping piece clears an obstruction instead of stopping at it, so the
// segment on the far side of the blocking piece stays reachable too.

Deno.test("calculateMoves() lets a jumping piece land on either side of a blocking friendly piece", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(800, 500, true)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]), true)

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
        enemies: [makePiece(800, 500, false)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]), true)

    const [capture] = calculator.calculateMoves(piece)
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
        enemies: [makePiece(800, 500, false), makePiece(1000, 500, false)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]), true)

    const [capture] = calculator.calculateMoves(piece)
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
            makePiece(700, 500, true),
            makePiece(780, 500, true),
        ],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]), true)

    const [nearSide, farSide] = calculator.calculateMoves(piece)
    assertAlmostEquals(nearSide.from.x, 500)
    assertAlmostEquals(nearSide.to.x, 636)
    assertAlmostEquals(farSide.from.x, 844)
    assertAlmostEquals(farSide.to.x, 1500)
})

// ---------------------------------------------------------------------------
// calculateMoves() and a pawn's capture rules
// ---------------------------------------------------------------------------
// A pawn is the only piece whose directions differ from each other: its
// advance may never take (CAPTURE.FORBIDDEN) and its diagonals may only
// take (CAPTURE.REQUIRED).

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
        friendlies: [makePiece(680, 500, true)],
    })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const [move] = calculator.calculateMoves(pawn)
    assertAlmostEquals(move.to.x, 616)
})

Deno.test("calculateMoves() stops a pawn short of an enemy in front of it rather than letting it capture forwards", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        enemies: [makePiece(700, 500, false)],
    })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const [move] = calculator.calculateMoves(pawn)
    // Right up against the enemy - 2 * RADIUS away - but never onto it.
    assertAlmostEquals(move.to.x, 636)
})

Deno.test("calculateMoves() drops a pawn's diagonals entirely when there's nothing to capture", () => {
    const board = makeBoard({ width: 5000, height: 5000 })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const moves = calculator.calculateMoves(pawn)
    assertEquals(moves.length, 1) // the advance, and neither diagonal
})

Deno.test("calculateMoves() never extends a pawn's diagonal capture past one square, even on its first move", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        // Two squares out along the capture diagonal - out of reach for a
        // one-square diagonal, so this would only be reachable if the
        // diagonal (wrongly) got the same doubling as the straight line.
        enemies: [makePiece(500 + Math.cos(Math.PI / 4) * 200, 500 + Math.sin(Math.PI / 4) * 200, false)],
    })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const [diagonal] = calculator.calculateMoves(pawn)
    assertAlmostEquals(diagonal.to.x, 600)
    assertAlmostEquals(diagonal.to.y, 600)
})

Deno.test("calculateMoves() drops a pawn's diagonal when a friendly piece cuts it short of the enemy it was for", () => {
    // The diagonal is blocked at ~55, well before it reaches the enemy at
    // 141 - so it isn't a capture any more, and a capture is the only
    // reason a pawn may move diagonally at all.
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(520, 600, true)],
        enemies: [makePiece(600, 600, false)],
    })
    const calculator = new MoveCalculator(board)
    const pawn = makePawn(500, 500, true, false)

    const moves = calculator.calculateMoves(pawn)
    assertEquals(moves.length, 1)
    assertAlmostEquals(moves[0].to.x, 700) // only the advance survives
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
        friendlies: [makePiece(520, 500, true)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]))

    const moves = calculator.calculateMoves(piece)
    assertEquals(moves.length, 0)
})

Deno.test("calculateMoves() resumes a jumping piece's line at the obstruction's far edge when it starts inside it", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        friendlies: [makePiece(520, 500, true)],
    })
    const calculator = new MoveCalculator(board)
    const piece = makePiece(500, 500, true, options(0, 1000, [new Vector(1, 0)]), true)

    const moves = calculator.calculateMoves(piece)
    assertEquals(moves.length, 1)
    const farSide = moves[0]
    assertAlmostEquals(farSide.from.x, 584)
    assertAlmostEquals(farSide.to.x, 1500)
})

Deno.test("calculateMoves() does not throw when a jump's line clips entirely off the board", () => {
    const board = makeBoard({
        width: 2000,
        height: 2000,
        // Any nearby piece reaches this: obstructionsNear() considers it
        // for every direction of the move set, not just ones actually
        // heading toward it.
        friendlies: [makePiece(RADIUS + 50, RADIUS + 50, true)],
    })
    const calculator = new MoveCalculator(board)
    // A knight-shaped move (minDistance 0.5 * SPACE) starting at the
    // playable area's top-left corner: the (-2, -1) jump's `from` point is
    // already off the board, so the whole line clips to undefined.
    const knight = makePiece(RADIUS, RADIUS, true, options(50, 100, [new Vector(-2, -1)]), true)

    const moves = calculator.calculateMoves(knight)
    assertEquals(moves, [])
})

// ---------------------------------------------------------------------------
// calculateMoves() with a non-unit-length direction vector (e.g. a Knight's
// (2, 1)) combined with a non-zero minDistance
// ---------------------------------------------------------------------------
// obstructionsNear() has to measure its reach out to where the line actually
// ends, not from the raw maxDistance scalar - a direction vector like (2, 1)
// has length sqrt(5), so a knight's real reach is over twice that scalar.
// Getting this wrong drops obstructions near the far end of the leap, and -
// because minDistance pushes the line's near end away from the piece's own
// square - near its start too.

Deno.test("calculateMoves() blocks a knight-shaped jump on a friendly piece sitting on its landing square", () => {
    const board = makeBoard({
        width: 5000,
        height: 5000,
        // 223.6 away from the piece - beyond maxDistance(100) + obstructionRadius(64),
        // so it would be missed entirely unless the reach also scales by the
        // direction vector's length (sqrt(5) for a (2, 1) knight jump).
        friendlies: [makePiece(700, 600, true)],
    })
    const calculator = new MoveCalculator(board)
    const knight = makePiece(500, 500, true, options(50, 100, [new Vector(2, 1)]), true)

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
        friendlies: [makePiece(657.2433402239947, 578.6216701119973, true)],
    })
    const calculator = new MoveCalculator(board)
    const knight = makePiece(500, 500, true, options(50, 100, [new Vector(2, 1)]), true)

    const moves = calculator.calculateMoves(knight)
    // Blocked right at the line's own start - never left unobstructed as it
    // would be if the obstruction had gone undetected.
    assertEquals(moves.length, 0)
})

// ---------------------------------------------------------------------------
// calculateMoves() and castling
// ---------------------------------------------------------------------------
// The rule itself is CastlingService's (and tested there); what matters here
// is that its extra option is swept and clipped like any other, and shows up
// as a separate stretch of board two spaces out rather than lengthening the
// king's ordinary one-space move.

const backRank = board => board.height - HALF_SPACE

const setUpCastling = () => {
    const board = new Board()
    const king = new King(4 * SPACE + HALF_SPACE, backRank(board), true)
    board.addPiece(king)
    board.addPiece(new Rook(HALF_SPACE, backRank(board), true))
    board.addPiece(new Rook(7 * SPACE + HALF_SPACE, backRank(board), true))
    return { board, king }
}

// Every stretch the king can move along its own rank in one direction,
// nearest first - the diagonals, which leave the rank, are not of interest
// here.
const movesAlongRank = (calculator, king, sign) => calculator.calculateMoves(king)
    .filter(move => move.from.y === king.position.y && move.to.y === king.position.y)
    .filter(move => Math.sign(move.to.x - king.position.x) === sign)
    .sort((a, b) => Math.abs(a.to.x - king.position.x) - Math.abs(b.to.x - king.position.x))

Deno.test("calculateMoves() offers a king a separate two-space stretch toward each rook that hasn't moved", () => {
    const { board, king } = setUpCastling()
    const calculator = new MoveCalculator(board)

    const [ordinary, castle] = movesAlongRank(calculator, king, -1)
    assertAlmostEquals(ordinary.to.x, king.position.x - SPACE) // the usual one-space move
    assertAlmostEquals(castle.from.x, king.position.x - 199) // and, past a gap, the castle
    assertAlmostEquals(castle.to.x, king.position.x - 201)
})

Deno.test("calculateMoves() doesn't let the rook a king is castling with trim the castle short", () => {
    // This rook stands close enough that its own square reaches into the far
    // end of the castling stretch. It mustn't cut it down - the two pass
    // through each other, which is the whole move.
    const board = new Board()
    const king = new King(4 * SPACE + HALF_SPACE, backRank(board), true)
    board.addPiece(king)
    board.addPiece(new Rook(king.position.x + 250, backRank(board), true))
    const calculator = new MoveCalculator(board)

    const [, castle] = movesAlongRank(calculator, king, 1)
    assertAlmostEquals(castle.to.x, king.position.x + 201)
})

Deno.test("calculateMoves() offers a king no castling stretch on a side something is standing in the way of", () => {
    const { board, king } = setUpCastling()
    board.addPiece(new Bishop(2 * SPACE + HALF_SPACE, backRank(board), true))
    const calculator = new MoveCalculator(board)

    assertEquals(movesAlongRank(calculator, king, -1).length, 1) // the one-space move only
    assertEquals(movesAlongRank(calculator, king, 1).length, 2) // the far side still castles
})

// ---------------------------------------------------------------------------
// closestLegalPoint()
// ---------------------------------------------------------------------------

Deno.test("closestLegalPoint() snaps to the nearest point on the single line given", () => {
    const calculator = new MoveCalculator(makeBoard())
    const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })

    const point = calculator.closestLegalPoint([line], { x: 4, y: 3 })
    assertAlmostEquals(point.x, 4)
    assertAlmostEquals(point.y, 0)
})

Deno.test("closestLegalPoint() picks whichever line is actually closest", () => {
    const calculator = new MoveCalculator(makeBoard())
    const near = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
    const far = new Line({ x: 0, y: 100 }, { x: 10, y: 100 })

    const point = calculator.closestLegalPoint([far, near], { x: 4, y: 1 })
    assertAlmostEquals(point.x, 4)
    assertAlmostEquals(point.y, 0)
})

Deno.test("closestLegalPoint() returns null when given no lines", () => {
    const calculator = new MoveCalculator(makeBoard())

    assertEquals(calculator.closestLegalPoint([], { x: 4, y: 1 }), null)
})
