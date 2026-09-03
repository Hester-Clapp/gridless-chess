import { Board } from "./shared/entity/Board.js"
import { Game } from "./shared/entity/Game.js"
import { MoveCalculator } from "./shared/service/MoveCalculator.js"
import { Renderer } from "./frontend/controller/Renderer.js"
import { StatusDisplay } from "./frontend/controller/StatusDisplay.js"
import { DragController } from "./frontend/controller/DragController.js"
import { BoardCoordinateMapper } from "./frontend/controller/BoardCoordinateMapper.js"
import { BoardView } from "./frontend/controller/BoardView.js"
import { PointerInputBinder } from "./frontend/controller/PointerInputBinder.js"
import { GameClient } from "./frontend/interface/GameClient.js"

// --- Temporary in-process stand-in for the backend. Delete this block
// and swap GameClient's constructor arg for a WebSocket connection
// once the server exists; nothing below this comment should change. ---
import { GameSession } from "./backend/interface/GameSession.js"
import { BoardSetupService } from "./backend/service/BoardSetupService.js"
import { MoveExecutionService } from "./backend/service/MoveExecutionService.js"
import { MoveValidator } from "./backend/service/MoveValidator.js"
import { CaptureService } from "./backend/service/CaptureService.js"
import { PromotionService } from "./backend/service/PromotionService.js"

const serverBoard = new Board()
new BoardSetupService().standardSetup(serverBoard)
const serverGame = new Game(serverBoard)
const serverMoveCalculator = new MoveCalculator(serverBoard)
const gameSession = new GameSession(
    serverGame,
    serverBoard,
    new MoveValidator(serverMoveCalculator),
    new MoveExecutionService(serverMoveCalculator, new CaptureService(serverMoveCalculator), new PromotionService())
)
// --- end stand-in ---

const client = new GameClient(gameSession)
const { boardState: board, turn } = await client.init()
const game = new Game(board) // local client-side mirror, hydrated from the server

const canvas = document.getElementById("board")
const ctx = canvas.getContext("2d")

const moveService = new MoveCalculator(board)
const captureService = new CaptureService(moveService)
const promotionService = new PromotionService()
const moveExecutionService = new MoveExecutionService(moveService, captureService, promotionService)
const renderer = new Renderer(moveService)
const statusDisplay = new StatusDisplay(document.getElementById("status"))

const coordinateMapper = new BoardCoordinateMapper(canvas, board)
const view = new BoardView(game, board, renderer, canvas, ctx, statusDisplay, captureService, () => !game.whiteToMove)
const dragController = new DragController(game, board, moveService, captureService, moveExecutionService, snapshot => view.render(snapshot))
new PointerInputBinder(canvas, coordinateMapper, dragController, () => !game.whiteToMove)

view.render({ selectedPiece: null, captureTarget: null, lastMovedPiece: null }) // initial paint