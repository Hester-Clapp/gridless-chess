import { StatusDisplay } from "./frontend/controller/StatusDisplay.js"
import { GameScreenController } from "./frontend/controller/GameScreenController.js"
import { GameApp } from "./frontend/GameApp.js"
import { GameSocketTransport } from "./frontend/transport/GameSocketTransport.js"

const canvas = document.getElementById("board")

const screenController = new GameScreenController({
    canvas,
    ctx: canvas.getContext("2d"),
    piecesContainer: document.getElementById("pieces"),
    statusDisplay: new StatusDisplay(document.getElementById("status")),
    queueScreen: document.getElementById("queue"),
    gameScreen: document.getElementById("game"),
    playAgainButton: document.getElementById("play-again"),
})

function socketUrl() {
    return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
}

const app = new GameApp(screenController, () => new GameSocketTransport(new WebSocket(socketUrl())))

document.getElementById("play-again").addEventListener("click", () => app.playAgain())

app.connect()
