import { assertEquals, assertStrictEquals } from "@std/assert"
import { Board } from "../../shared/entity/Board.js"
import { Game } from "../../shared/entity/Game.js"
import { GameSerializer } from "./GameSerializer.js"

Deno.test("round-trips whiteToMove and winner", () => {
    const board = new Board()
    const game = new Game(board)
    game.whiteToMove = false
    game.declareWinner(true)

    const restored = GameSerializer.fromJSON(GameSerializer.toJSON(game), board)

    assertStrictEquals(restored.whiteToMove, false)
    assertStrictEquals(restored.winner, true)
    assertStrictEquals(restored.board, board)
})

Deno.test("winner stays null for an in-progress game", () => {
    const board = new Board()
    const game = new Game(board)

    const restored = GameSerializer.fromJSON(GameSerializer.toJSON(game), board)

    assertEquals(restored.winner, null)
})
