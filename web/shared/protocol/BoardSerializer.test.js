import { assertEquals, assertStrictEquals } from "@std/assert"
import { Board } from "../entity/Board.js"
import { King, Pawn } from "../entity/Piece.js"
import { BoardSerializer } from "./BoardSerializer.js"

Deno.test("round-trips a board's pieces and derived dimensions", () => {
    const board = new Board()
    const whiteKing = new King(400, 700, true)
    const blackPawn = new Pawn(150, 150, false)
    board.addPiece(whiteKing)
    board.addPiece(blackPawn)

    const restored = BoardSerializer.fromJSON(BoardSerializer.toJSON(board))

    assertStrictEquals(restored.width, board.width)
    assertStrictEquals(restored.height, board.height)
    assertEquals(restored.getKing(true) instanceof King, true)
    assertStrictEquals(restored.getKing(true).id, whiteKing.id)
    // Positions are the only trace the setup deviation leaves, so they have
    // to survive exactly - nothing re-derives them at the far end.
    assertEquals(restored.getKing(true).position, whiteKing.position)
    assertStrictEquals(restored.pieces.black.length, 1)
    assertStrictEquals(restored.pieces.black[0].id, blackPawn.id)
})

Deno.test("restored pieces are resolvable by id, same as the original board", () => {
    const board = new Board()
    const piece = new Pawn(200, 200, true)
    board.addPiece(piece)

    const restored = BoardSerializer.fromJSON(BoardSerializer.toJSON(board))

    assertStrictEquals(restored.getPieceById(piece.id).type, "pawn")
})
