import { assertEquals, assertStrictEquals } from "@std/assert"
import { Board } from "./Board.js"

const makePiece = (x, y, radius = 32) => ({ position: { x, y }, radius })

Deno.test("getPieceAt() returns the piece whose circle contains the point", () => {
    const board = new Board()
    const piece = makePiece(100, 100)
    board.pieces.white.push(piece)

    assertStrictEquals(board.getPieceAt({ x: 110, y: 100 }), piece)
})

Deno.test("getPieceAt() returns undefined when no piece's circle contains the point", () => {
    const board = new Board()
    board.pieces.white.push(makePiece(100, 100))

    assertEquals(board.getPieceAt({ x: 500, y: 500 }), undefined)
})

Deno.test("getPieceAt() checks pieces of both colours", () => {
    const board = new Board()
    const blackPiece = makePiece(300, 300)
    board.pieces.black.push(blackPiece)

    assertStrictEquals(board.getPieceAt({ x: 300, y: 300 }), blackPiece)
})

Deno.test("mirror() reflects a point across the centre of the board", () => {
    const board = new Board()

    assertEquals(board.mirror({ x: 0, y: 0 }), { x: board.width, y: board.height })
    assertEquals(board.mirror({ x: board.width, y: board.height }), { x: 0, y: 0 })
})

Deno.test("mirror() is its own inverse", () => {
    const board = new Board()
    const point = { x: 123, y: 456 }

    assertEquals(board.mirror(board.mirror(point)), point)
})

Deno.test("getPieceById() returns the piece with a matching id", () => {
    const board = new Board()
    const piece = { ...makePiece(100, 100), id: "abc" }
    board.pieces.white.push(piece)

    assertStrictEquals(board.getPieceById("abc"), piece)
})

Deno.test("getPieceById() returns undefined when no piece matches", () => {
    const board = new Board()
    board.pieces.white.push({ ...makePiece(100, 100), id: "abc" })

    assertEquals(board.getPieceById("nope"), undefined)
})

Deno.test("removePiece() takes the piece off its own colour's collection", () => {
    const board = new Board()
    const white = { ...makePiece(100, 100), white: true }
    const black = { ...makePiece(200, 200), white: false }
    board.addPiece(white)
    board.addPiece(black)

    board.removePiece(black)

    assertEquals(board.pieces.black, [])
    assertEquals(board.pieces.white, [white])
})

Deno.test("removePiece() is a no-op for a piece that isn't on the board", () => {
    const board = new Board()
    const white = { ...makePiece(100, 100), white: true }
    board.addPiece(white)

    board.removePiece({ ...makePiece(300, 300), white: true })

    assertEquals(board.pieces.white, [white])
})
