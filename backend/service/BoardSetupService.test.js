import { assertAlmostEquals, assertEquals, assertNotEquals } from "@std/assert"
import { Board } from "../../web/shared/entity/Board.js"
import { SPACE, HALF_SPACE } from "../../web/shared/entity/geometry/constants.js"
import { Vector } from "../../web/shared/entity/geometry/Vector.js"
import { BoardSetupService } from "./BoardSetupService.js"

const setUp = deviation => {
    const board = new Board()
    new BoardSetupService(deviation).standardSetup(board)
    return board
}

// Pieces of one colour, in the order they were placed, along the rank they
// were placed on.
const rank = (board, white, y) => board.pieces[white ? "white" : "black"]
    .filter(piece => Math.abs(piece.position.y - y) < HALF_SPACE)
    .sort((a, b) => a.position.x - b.position.x)

Deno.test("standardSetup() puts sixteen pieces of each colour on the board", () => {
    const board = setUp(0)

    assertEquals(board.pieces.white.length, 16)
    assertEquals(board.pieces.black.length, 16)
})

Deno.test("standardSetup() lays out the standard opening order, mirrored between the colours", () => {
    const board = setUp(0)
    const expected = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]

    assertEquals(rank(board, false, HALF_SPACE).map(piece => piece.type), expected)
    assertEquals(rank(board, true, board.height - HALF_SPACE).map(piece => piece.type), expected)
    assertEquals(rank(board, false, SPACE + HALF_SPACE).map(piece => piece.type), Array(8).fill("pawn"))
    assertEquals(rank(board, true, board.height - SPACE - HALF_SPACE).map(piece => piece.type), Array(8).fill("pawn"))
})

Deno.test("standardSetup() places pieces exactly on their squares when given no deviation", () => {
    const board = setUp(0)

    const [blackRook] = rank(board, false, HALF_SPACE)
    assertAlmostEquals(blackRook.position.x, HALF_SPACE)
    assertAlmostEquals(blackRook.position.y, HALF_SPACE)

    const whiteKing = board.getKing(true)
    assertAlmostEquals(whiteKing.position.x, 4 * SPACE + HALF_SPACE)
    assertAlmostEquals(whiteKing.position.y, board.height - HALF_SPACE)
})

Deno.test("standardSetup() nudges every piece off its exact square when given a deviation", () => {
    const board = setUp(0.08 * SPACE)

    const offSquare = board.getAllPieces().filter(piece =>
        piece.position.x % SPACE !== HALF_SPACE || piece.position.y % SPACE !== HALF_SPACE)
    assertEquals(offSquare.length, 32)
})

Deno.test("standardSetup() nudges the two colours of a pair independently rather than mirroring one", () => {
    const board = setUp(0.08 * SPACE)

    // Same square, so an exact mirror would leave the two on the same file.
    assertNotEquals(board.getKing(true).position.x, board.getKing(false).position.x)
})

Deno.test("standardSetup() keeps every piece within a few deviations of its square", () => {
    const deviation = 0.08 * SPACE
    const board = setUp(deviation)

    for (const piece of board.getAllPieces()) {
        const square = {
            x: Math.floor(piece.position.x / SPACE) * SPACE + HALF_SPACE,
            y: Math.floor(piece.position.y / SPACE) * SPACE + HALF_SPACE,
        }
        // Six deviations out is a one-in-sixty-million nudge, so this is a
        // real assertion rather than a flaky one.
        assertEquals(Vector.between(square, piece.position).length < 6 * deviation, true)
    }
})

Deno.test("standardSetup() leaves the board itself with nothing to say about deviation", () => {
    // Where pieces get placed is this service's business; Board only holds
    // them once they're placed.
    const board = setUp(0.08 * SPACE)

    assertEquals("deviation" in board, false)
})
