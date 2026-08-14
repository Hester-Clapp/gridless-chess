import { Board } from "./entity/Board.js"
import { Game } from "./entity/Game.js"
import { Renderer } from "./controller/Renderer.js"
import { MovementController } from "./controller/MovementController.js"

const board = new Board()
board.setUp()

const game = new Game(board)

const canvas = document.getElementById("board")
const ctx = canvas.getContext("2d")

const renderer = new Renderer()
renderer.renderBoard(board, ctx)

new MovementController(game, renderer, canvas, ctx)
