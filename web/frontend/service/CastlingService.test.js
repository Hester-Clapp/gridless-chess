import { assertAlmostEquals, assertEquals, assertStrictEquals } from "@std/assert"
import { Board } from "../../shared/entity/Board.js"
import { King, Rook, Bishop, Knight } from "../../shared/entity/Piece.js"
import { SPACE, HALF_SPACE } from "../../shared/entity/geometry/constants.js"
import { CastlingService } from "./CastlingService.js"

// The standard opening back rank, laid out exactly rather than with the
// random deviation a real game uses: castling is about distances, and these
// tests are easier to read when those are round numbers.
//
//   a1 rook 50 | b1 150 | c1 250 | d1 350 | e1 king 450 | f1 550 | g1 650 | h1 rook 750
const square = file => file * SPACE + HALF_SPACE

const setUp = ({ extras = [] } = {}) => {
    const board = new Board()
    const y = board.height - HALF_SPACE
    const king = new King(square(4), y, true)
    const queenSideRook = new Rook(square(0), y, true)
    const kingSideRook = new Rook(square(7), y, true)

    for (const piece of [king, queenSideRook, kingSideRook]) board.addPiece(piece)
    for (const [Type, file] of extras) board.addPiece(new Type(square(file), y, true))

    return { board, king, queenSideRook, kingSideRook, y }
}

const left = piece => ({ x: piece.position.x - 2 * SPACE, y: piece.position.y })
const right = piece => ({ x: piece.position.x + 2 * SPACE, y: piece.position.y })

// ---------------------------------------------------------------------------
// castlingOptions() - the extra move a king gets
// ---------------------------------------------------------------------------

Deno.test("castlingOptions() gives an unmoved king one option toward each unmoved rook", () => {
    const { board, king } = setUp()
    const service = new CastlingService()

    const [queenSide, kingSide] = service.castlingOptions(board, king)
    assertEquals(queenSide.vector.x, -1)
    assertEquals(kingSide.vector.x, 1)
    // A stretch centred two spaces out, never a slide from where it stands.
    assertAlmostEquals(queenSide.minDistance, 199)
    assertAlmostEquals(queenSide.maxDistance, 201)
})

Deno.test("castlingOptions() gives nothing to a king that has already moved", () => {
    const { board, king } = setUp()
    king.hasMoved = true

    assertEquals(new CastlingService().castlingOptions(board, king), [])
})

Deno.test("castlingOptions() gives nothing on the side of a rook that has already moved", () => {
    const { board, king, queenSideRook } = setUp()
    queenSideRook.hasMoved = true

    const castles = new CastlingService().castlingOptions(board, king)
    assertEquals(castles.length, 1)
    assertEquals(castles[0].vector.x, 1)
})

Deno.test("castlingOptions() gives nothing to a piece that isn't a king", () => {
    const { board, queenSideRook } = setUp()

    assertEquals(new CastlingService().castlingOptions(board, queenSideRook), [])
})

Deno.test("castlingOptions() gives nothing on a side where a piece stands on the king's path", () => {
    const { board, king } = setUp({ extras: [[Bishop, 3]] }) // d1, one space along the queen-side path

    const castles = new CastlingService().castlingOptions(board, king)
    assertEquals(castles.length, 1)
    assertEquals(castles[0].vector.x, 1)
})

Deno.test("castlingOptions() gives nothing on a side where a piece stands on the king's destination", () => {
    const { board, king } = setUp({ extras: [[Knight, 6]] }) // g1, where a king-side castle lands

    const castles = new CastlingService().castlingOptions(board, king)
    assertEquals(castles.length, 1)
    assertEquals(castles[0].vector.x, -1)
})

Deno.test("castlingOptions() ignores a piece standing between the king's destination and the rook", () => {
    // b1 is past where the king stops, so it never gets in the king's way -
    // and the rook doesn't slide past it, it jumps to the far side of the
    // king. Standard chess would refuse this; this variant doesn't.
    const { board, king } = setUp({ extras: [[Knight, 1]] })

    assertEquals(new CastlingService().castlingOptions(board, king).length, 2)
})

Deno.test("castlingOptions() ignores an enemy piece's own rook when looking for one to castle with", () => {
    const { board, king, y } = setUp()
    const black = new Rook(square(2), y, false)
    board.addPiece(black)
    black.hasMoved = false

    // The enemy rook is on the king's path, so that side is blocked - but
    // it's the blocking that stops it, not any confusion about whose rook
    // could castle.
    const castles = new CastlingService().castlingOptions(board, king)
    assertEquals(castles.length, 1)
    assertEquals(castles[0].vector.x, 1)
})

// ---------------------------------------------------------------------------
// castleMoveFor() - the rook's half of the move
// ---------------------------------------------------------------------------

Deno.test("castleMoveFor() sends the queen-side rook three whole spaces, to the other side of the king", () => {
    const { board, king, queenSideRook } = setUp()

    const castle = new CastlingService().castleMoveFor(board, king, left(king))

    assertStrictEquals(castle.piece, queenSideRook)
    assertAlmostEquals(castle.position.x, square(0) + 3 * SPACE)
    assertAlmostEquals(castle.position.y, king.position.y)
})

Deno.test("castleMoveFor() sends the king-side rook two whole spaces, to the other side of the king", () => {
    const { board, king, kingSideRook } = setUp()

    const castle = new CastlingService().castleMoveFor(board, king, right(king))

    assertStrictEquals(castle.piece, kingSideRook)
    assertAlmostEquals(castle.position.x, square(7) - 2 * SPACE)
})

// The server is the only thing that moves a piece; this just reports what
// should move where, so nothing on this board may shift as a side effect.
Deno.test("castleMoveFor() moves nothing itself - neither the king nor the rook", () => {
    const { board, king, queenSideRook } = setUp()
    const kingBefore = { ...king.position }
    const rookBefore = { ...queenSideRook.position }

    new CastlingService().castleMoveFor(board, king, left(king))

    assertEquals(king.position, kingBefore)
    assertEquals(queenSideRook.position, rookBefore)
    assertEquals(queenSideRook.hasMoved, false)
})

Deno.test("castleMoveFor() is null for an ordinary one-space king move", () => {
    const { board, king, queenSideRook } = setUp()

    const castle = new CastlingService().castleMoveFor(board, king, { x: king.position.x - SPACE, y: king.position.y })

    assertEquals(castle, null)
    assertAlmostEquals(queenSideRook.position.x, square(0))
})

Deno.test("castleMoveFor() is null for a king move between one and two spaces", () => {
    const { board, king } = setUp()

    assertEquals(new CastlingService().castleMoveFor(board, king, { x: king.position.x - 1.5 * SPACE, y: king.position.y }), null)
})

Deno.test("castleMoveFor() still castles a two-space move that's slightly off", () => {
    const { board, king, queenSideRook } = setUp()

    // Within tolerance both along the rank and across it - a drag never
    // lands on an exact number.
    const castle = new CastlingService().castleMoveFor(board, king, { x: king.position.x - 2 * SPACE + 0.5, y: king.position.y + 0.5 })

    assertStrictEquals(castle.piece, queenSideRook)
})

Deno.test("castleMoveFor() is null when the king has already moved", () => {
    const { board, king } = setUp()
    king.hasMoved = true

    assertEquals(new CastlingService().castleMoveFor(board, king, left(king)), null)
})

Deno.test("castleMoveFor() is null when the path the king would cross is blocked", () => {
    const { board, king } = setUp({ extras: [[Bishop, 3]] })

    assertEquals(new CastlingService().castleMoveFor(board, king, left(king)), null)
})

Deno.test("castleMoveFor() is null for a piece that isn't a king", () => {
    const { board, queenSideRook } = setUp()

    assertEquals(new CastlingService().castleMoveFor(board, queenSideRook, right(queenSideRook)), null)
})
