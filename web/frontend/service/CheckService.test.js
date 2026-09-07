import { assertEquals, assertStrictEquals } from "@std/assert"
import { Board } from "../../shared/entity/Board.js"
import { King, Rook, Pawn } from "../../shared/entity/Piece.js"
import { SPACE, HALF_SPACE } from "../../shared/entity/geometry/constants.js"
import { CaptureService } from "../../shared/service/CaptureService.js"
import { MoveCalculator } from "./MoveCalculator.js"
import { CheckService } from "./CheckService.js"

const square = file => file * SPACE + HALF_SPACE

const serviceFor = board => new CheckService(new MoveCalculator(board), new CaptureService())

Deno.test("getCheckStatus() reports no threats when nothing can reach the king", () => {
    const board = new Board()
    const king = new King(square(4), square(7), true)
    board.addPiece(king)
    board.addPiece(new Rook(square(0), square(0), false))

    const status = serviceFor(board).getCheckStatus(board, true)

    assertStrictEquals(status.king, king)
    assertEquals(status.threats, [])
})

Deno.test("getCheckStatus() names the enemy piece whose moves reach the king", () => {
    const board = new Board()
    const king = new King(square(4), square(7), true)
    const rook = new Rook(square(4), square(0), false) // same file, nothing between
    board.addPiece(king)
    board.addPiece(rook)

    const status = serviceFor(board).getCheckStatus(board, true)

    assertEquals(status.threats, [rook])
})

Deno.test("getCheckStatus() doesn't count a threat that a piece in the way cuts short", () => {
    const board = new Board()
    const king = new King(square(4), square(7), true)
    board.addPiece(king)
    board.addPiece(new Rook(square(4), square(0), false))
    board.addPiece(new Pawn(square(4), square(4), true)) // blocks the file

    assertEquals(serviceFor(board).getCheckStatus(board, true).threats, [])
})

Deno.test("getCheckStatus() reports no threats for a colour whose king has already been taken", () => {
    const board = new Board()
    board.addPiece(new Rook(square(4), square(0), false))

    const status = serviceFor(board).getCheckStatus(board, true)

    assertEquals(status.king, undefined)
    assertEquals(status.threats, [])
})
