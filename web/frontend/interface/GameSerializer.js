import { Game } from "../../shared/entity/Game.js"

// Game <-> plain JSON, given an already-deserialized board to attach it to.
// time/gameLength are omitted - like Piece.value, unused anywhere in the
// codebase today.
export const GameSerializer = {
    toJSON(game) {
        return {
            whiteToMove: game.whiteToMove,
            winner: game.winner,
        }
    },

    fromJSON(json, board) {
        const game = new Game(board)
        game.whiteToMove = json.whiteToMove
        game.winner = json.winner
        return game
    },
}
