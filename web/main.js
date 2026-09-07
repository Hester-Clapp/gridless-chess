import { StatusDisplay } from "./frontend/controller/StatusDisplay.js"
import { GameScreenController } from "./frontend/controller/GameScreenController.js"
import { GameStateService } from "./frontend/service/GameStateService.js"
import { GameApp } from "./frontend/service/GameApp.js"

const canvas = document.getElementById("board")
const gameState = new GameStateService()

const screenController = new GameScreenController({
    canvas,
    ctx: canvas.getContext("2d"),
    piecesContainer: document.getElementById("pieces"),
    statusDisplay: new StatusDisplay(document.getElementById("status")),
    queueScreen: document.getElementById("queue"),
    gameScreen: document.getElementById("game"),
    playAgainButton: document.getElementById("play-again"),
    gameState,
})

new GameApp(screenController, gameState).connect()
