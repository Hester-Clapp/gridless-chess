import { assertAlmostEquals, assertEquals, assertStrictEquals } from "@std/assert"
import { Board } from "../entity/Board.js"
import { King, Rook, Bishop, Knight } from "../entity/Piece.js"
import { SPACE, HALF_SPACE } from "../entity/geometry/constants.js"
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
    assertAlmostEquals(queenSide.minDistance, 180)
    assertAlmostEquals(queenSide.maxDistance, 220)
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
// resolveCastle() - the rook's half of the move
// ---------------------------------------------------------------------------

Deno.test("resolveCastle() moves the queen-side rook three whole spaces, to the other side of the king", () => {
    const { board, king, queenSideRook } = setUp()

    const rook = new CastlingService().resolveCastle(board, king, left(king))

    assertStrictEquals(rook, queenSideRook)
    assertAlmostEquals(rook.position.x, square(0) + 3 * SPACE)
    assertAlmostEquals(rook.position.y, king.position.y)
    assertEquals(rook.hasMoved, true)
})

Deno.test("resolveCastle() moves the king-side rook two whole spaces, to the other side of the king", () => {
    const { board, king, kingSideRook } = setUp()

    const rook = new CastlingService().resolveCastle(board, king, right(king))

    assertStrictEquals(rook, kingSideRook)
    assertAlmostEquals(rook.position.x, square(7) - 2 * SPACE)
})

Deno.test("resolveCastle() leaves the king itself alone - its caller commits that move", () => {
    const { board, king } = setUp()
    const before = { ...king.position }

    new CastlingService().resolveCastle(board, king, left(king))

    assertEquals(king.position, before)
})

Deno.test("resolveCastle() does nothing for an ordinary one-space king move", () => {
    const { board, king, queenSideRook } = setUp()

    const rook = new CastlingService().resolveCastle(board, king, { x: king.position.x - SPACE, y: king.position.y })

    assertEquals(rook, null)
    assertAlmostEquals(queenSideRook.position.x, square(0))
})

Deno.test("resolveCastle() does nothing for a king move between one and two spaces", () => {
    const { board, king } = setUp()

    assertEquals(new CastlingService().resolveCastle(board, king, { x: king.position.x - 1.5 * SPACE, y: king.position.y }), null)
})

Deno.test("resolveCastle() still castles a two-space move that's slightly off", () => {
    const { board, king, queenSideRook } = setUp()

    // Within tolerance both along the rank and across it - a drag never
    // lands on an exact number.
    const rook = new CastlingService().resolveCastle(board, king, { x: king.position.x - 1.9 * SPACE, y: king.position.y + 5 })

    assertStrictEquals(rook, queenSideRook)
})

Deno.test("resolveCastle() does nothing when the king has already moved", () => {
    const { board, king } = setUp()
    king.hasMoved = true

    assertEquals(new CastlingService().resolveCastle(board, king, left(king)), null)
})

Deno.test("resolveCastle() does nothing when the path the king would cross is blocked", () => {
    const { board, king } = setUp({ extras: [[Bishop, 3]] })

    assertEquals(new CastlingService().resolveCastle(board, king, left(king)), null)
})

Deno.test("resolveCastle() does nothing for a piece that isn't a king", () => {
    const { board, queenSideRook } = setUp()

    assertEquals(new CastlingService().resolveCastle(board, queenSideRook, right(queenSideRook)), null)
})
