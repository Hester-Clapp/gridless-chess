import { assertStrictEquals } from "@std/assert"
import { Game } from "./Game.js"

const makePiece = white => ({ white })

Deno.test("Game starts with white to move", () => {
    const game = new Game({})
    assertStrictEquals(game.whiteToMove, true)
})

Deno.test("isTurn() is true for white pieces when white is to move", () => {
    const game = new Game({})
    assertStrictEquals(game.isTurn(makePiece(true)), true)
    assertStrictEquals(game.isTurn(makePiece(false)), false)
})

// Deno.test("advanceTurn() hands the move to the other colour", () => {
//     const game = new Game({})

//     game.advanceTurn()

//     assertStrictEquals(game.whiteToMove, false)
//     assertStrictEquals(game.isTurn(makePiece(true)), false)
//     assertStrictEquals(game.isTurn(makePiece(false)), true)
// })

Deno.test("advanceTurn() toggles back on a second call", () => {
    const game = new Game({})

    game.advanceTurn()
    game.advanceTurn()

    assertStrictEquals(game.whiteToMove, true)
})

Deno.test("a new game has no winner and isn't over", () => {
    const game = new Game({})

    assertStrictEquals(game.winner, null)
    assertStrictEquals(game.isOver, false)
})

Deno.test("declareWinner() records the winning colour and ends the game", () => {
    const game = new Game({})

    game.declareWinner(true)

    assertStrictEquals(game.winner, true)
    assertStrictEquals(game.isOver, true)
})

Deno.test("declareWinner() supports black winning too", () => {
    const game = new Game({})

    game.declareWinner(false)

    assertStrictEquals(game.winner, false)
    assertStrictEquals(game.isOver, true)
})

Deno.test("isTurn() is false for either colour once the game is over", () => {
    const game = new Game({})

    game.declareWinner(true)

    assertStrictEquals(game.isTurn(makePiece(true)), false)
    assertStrictEquals(game.isTurn(makePiece(false)), false)
})
