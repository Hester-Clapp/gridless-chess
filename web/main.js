import { Renderer } from "./frontend/controller/Renderer.js"
import { StatusDisplay } from "./frontend/controller/StatusDisplay.js"
import { DragController } from "./frontend/controller/DragController.js"
import { BoardCoordinateMapper } from "./frontend/controller/BoardCoordinateMapper.js"
import { BoardView } from "./frontend/controller/BoardView.js"
import { PointerInputBinder } from "./frontend/controller/PointerInputBinder.js"
import { GameClient } from "./frontend/interface/GameClient.js"
import { GameSocketTransport } from "./frontend/transport/GameSocketTransport.js"
import { MoveCalculator } from "./shared/service/MoveCalculator.js"
import { CaptureService } from "./shared/service/CaptureService.js"

const canvas = document.getElementById("board")
const ctx = canvas.getContext("2d")
const statusDisplay = new StatusDisplay(document.getElementById("status"))

const queueScreen = document.getElementById("queue")
const gameScreen = document.getElementById("game")
const playAgainButton = document.getElementById("play-again")

// SPA-style screen swap - both screens live in the DOM from page load,
// visibility is just toggled via class, and nothing ever navigates.
function showGameScreen() {
    queueScreen.classList.add("hidden")
    gameScreen.classList.remove("hidden")
}

function showQueueScreen() {
    gameScreen.classList.add("hidden")
    playAgainButton.classList.add("hidden")
    queueScreen.classList.remove("hidden")
}

let client = null // replaced each time connect() runs - once at load, and again on "Play again"
let myWhite = null // fixed for the life of a connection - assigned once, in the init message
let lastMovedPiece = null // resolved fresh against each snapshot's board, not tracked by any DragGesture
let render = () => {} // replaced once the first snapshot builds a real BoardView

function renderSnapshot(gestureSnapshot = { selectedPiece: null, captureTarget: null }) {
    render({ ...gestureSnapshot, lastMovedPiece })
}

// Rebuilds the entire client-side object graph from a fresh server
// snapshot - Board/Game are wholesale replacements every time (there's no
// in-place mutation across the wire), and MoveCalculator holds its board by
// reference, so the simplest approach consistent with how this all worked
// before networking existed is to just build the graph again each time.
function buildScreen({ board, game, movedPieceId, reason = null }) {
    lastMovedPiece = movedPieceId ? board.getPieceById(movedPieceId) : null

    const moveService = new MoveCalculator(board)
    const captureService = new CaptureService(moveService)
    const renderer = new Renderer(moveService)
    const coordinateMapper = new BoardCoordinateMapper(canvas, board)
    const isFlipped = () => !myWhite // each connection has its own fixed seat now, not a shared screen that flips per turn

    const view = new BoardView(game, board, renderer, canvas, ctx, statusDisplay, captureService, isFlipped, reason)
    render = snapshot => view.render(snapshot)

    const dragController = new DragController(
        game, board, moveService, captureService,
        renderSnapshot,
        (pieceId, position) => client.makeMove(pieceId, position)
    )
    new PointerInputBinder(canvas, coordinateMapper, dragController, isFlipped)

    renderSnapshot()
    if (game.isOver) playAgainButton.classList.remove("hidden")
}

// Opens a fresh websocket and wires it up to the screens above. Called once
// at page load, and again from the "Play again" handler below - each call
// is a brand new /ws connection, which the server always treats as a fresh
// queue join, so there's no server-side "leave match, rejoin queue" step to
// coordinate.
function connect() {
    const socketUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
    client = new GameClient(new GameSocketTransport(new WebSocket(socketUrl)))

    client.onQueued(() => {
        // The queueing screen is already showing by default (see connect()'s
        // callers) - nothing else to do until a match arrives as an init.
    })

    client.onInit(({ white, board, game, movedPieceId }) => {
        myWhite = white
        showGameScreen()
        buildScreen({ board, game, movedPieceId })
    })

    client.onUpdate(({ board, game, movedPieceId, reason }) => {
        buildScreen({ board, game, movedPieceId, reason })
    })

    client.onRejected(({ reason }) => {
        console.warn("Move rejected:", reason)
    })
}

// The finished match's server-side MatchServer.handleClose() is a no-op
// once its game is already over (see MatchServer.js), so closing this
// socket is safe - it doesn't trigger a forfeit, it just lets the old
// connection go before opening a fresh one to queue up again.
playAgainButton.addEventListener("click", () => {
    client.transport.socket.close()
    showQueueScreen()
    myWhite = null
    lastMovedPiece = null
    connect()
})

connect()
