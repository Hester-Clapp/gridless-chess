import { Renderer } from "./Renderer.js"
import { PieceLayer } from "./PieceLayer.js"
import { DragController } from "./DragController.js"
import { BoardCoordinateMapper } from "./BoardCoordinateMapper.js"
import { BoardView } from "./BoardView.js"
import { PointerInputBinder } from "./PointerInputBinder.js"

// The screen for one connection: which of the two screens is showing, the
// canvas/DOM graph that draws the board, and the pointer wiring that turns
// drags into move attempts. Everything it draws it reads from
// GameStateService at render time, so nothing here is rebuilt per turn -
// startMatch() builds the graph once and refresh() only redraws it.
//
// It never touches the socket and never sees a wire payload: onMove and
// onPlayAgain are the only ways anything that happens on screen reaches back
// out, and GameApp is the one who points them at a real client.
export class GameScreenController {
    constructor({ canvas, ctx, piecesContainer, statusDisplay, queueScreen, gameScreen, playAgainButton, gameState }) {
        this.canvas = canvas
        this.ctx = ctx
        this.piecesContainer = piecesContainer
        this.statusDisplay = statusDisplay
        this.queueScreen = queueScreen
        this.gameScreen = gameScreen
        this.playAgainButton = playAgainButton
        this.gameState = gameState

        this.onMove = () => {} // replaced by GameApp once it owns a client
        this.onPlayAgain = () => {}
        playAgainButton.addEventListener("click", () => this.onPlayAgain())

        this.isFlipped = () => this.gameState.isFlipped

        // Built once by startMatch(), on the connection's first snapshot -
        // torn down and rebuilt only on reset(), never per turn.
        this.dragController = null
        this.pointerInputBinder = null
        this.pieceLayer = null
        this.view = null
    }

    // SPA-style screen swap - both screens live in the DOM from page load,
    // visibility is just toggled via class, and nothing ever navigates.
    showGame() {
        this.queueScreen.classList.add("hidden")
        this.gameScreen.classList.remove("hidden")
    }

    showQueue() {
        this.gameScreen.classList.add("hidden")
        this.playAgainButton.classList.add("hidden")
        this.queueScreen.classList.remove("hidden")
    }

    // Called before a fresh connect() - tears down the previous connection's
    // drag wiring and piece elements so startMatch() can build a clean set
    // rather than stacking listeners onto the same canvas.
    reset() {
        this.pointerInputBinder?.destroy()
        this.pointerInputBinder = null
        this.dragController = null
        this.pieceLayer?.destroy()
        this.pieceLayer = null
        this.view = null
    }

    // The move a drag just committed came back REJECTED rather than as an
    // update - no fresh board is coming to naturally retire the optimistic
    // drop position DragController.end() pinned, so undo it by hand.
    applyRejectedMove() {
        this.dragController?.revertLastAttempt()
    }

    // Builds the parts of the graph that only need to exist once per
    // connection: the drag-gesture wiring (and, inside it, the
    // PointerInputBinder's canvas/window listeners), the PieceLayer that owns
    // this connection's piece DOM elements, and the view that draws them.
    // Called once, when the match's first snapshot lands.
    startMatch() {
        this.showGame()

        const coordinateMapper = new BoardCoordinateMapper(this.canvas, this.gameState.board) // board dimensions are fixed for the game, only piece positions change

        this.dragController = new DragController(
            this.gameState,
            snapshot => this.renderSnapshot(snapshot),
            move => this.onMove(move)
        )
        this.pointerInputBinder = new PointerInputBinder(this.canvas, coordinateMapper, this.dragController, this.isFlipped)
        this.pieceLayer = new PieceLayer(this.piecesContainer)
        this.view = new BoardView(this.gameState, new Renderer(this.gameState), this.pieceLayer, this.canvas, this.ctx, this.statusDisplay)

        this.refresh()
    }

    refresh() {
        this.renderSnapshot()
        if (this.gameState.isOver) this.playAgainButton.classList.remove("hidden")
    }

    renderSnapshot(gestureSnapshot = { selectedPiece: null, captureTarget: null }) {
        this.view?.render({ ...gestureSnapshot, lastMovedPiece: this.gameState.lastMovedPiece })
    }
}
