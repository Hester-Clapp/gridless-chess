import { Board } from "./entity/Board.js"
import { Game } from "./entity/Game.js"
import { Renderer } from "./controller/Renderer.js"
import { StatusDisplay } from "./controller/StatusDisplay.js"
import { MovementController } from "./controller/MovementController.js"
import { BoardSetupService } from "./service/BoardSetupService.js"
import { MoveCalculator } from "./service/MoveCalculator.js"
import { CaptureService } from "./service/CaptureService.js"
import { PromotionService } from "./service/PromotionService.js"
import { MoveExecutionService } from "./service/MoveExecutionService.js"

const board = new Board()
new BoardSetupService().standardSetup(board)

const game = new Game(board)

const canvas = document.getElementById("board")
const ctx = canvas.getContext("2d")

const moveService = new MoveCalculator(board)
const captureService = new CaptureService(moveService)
const promotionService = new PromotionService()
const moveExecutionService = new MoveExecutionService(moveService, captureService, promotionService)

const renderer = new Renderer(moveService)
const statusDisplay = new StatusDisplay(document.getElementById("status"))

// Draws the initial position itself, so nothing needs rendering up front here.
new MovementController(game, renderer, canvas, ctx, statusDisplay, moveService, captureService, promotionService, moveExecutionService)
