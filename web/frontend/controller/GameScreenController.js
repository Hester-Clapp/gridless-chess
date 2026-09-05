import { Renderer } from "./Renderer.js"
import { DragController } from "./DragController.js"
import { BoardCoordinateMapper } from "./BoardCoordinateMapper.js"
import { BoardView } from "./BoardView.js"
import { PointerInputBinder } from "./PointerInputBinder.js"
import { MoveCalculator } from "../../shared/service/MoveCalculator.js"
import { CaptureService } from "../../shared/service/CaptureService.js"
import { DragMoveService } from "../service/DragMoveService.js"

// Builds the client-side object graph for one connection and holds the
// state that has to survive across snapshots: this connection's fixed seat,
// the running render callback, the last-moved piece (resolved fresh against
// each snapshot's board, not tracked by any DragGesture) - and the drag
// wiring itself (DragMoveService/DragController/PointerInputBinder), which
// initScreen() builds once and refreshScreen() only ever repoints at a new
// turn's state, never rebuilds. GameApp drives this via applyInit/
// applyUpdate and never touches canvas/DOM itself; this never touches the
// socket - onMove is the only way a drag attempt here reaches back out to
// the network, and GameApp is the one who points it at a real client.
export class GameScreenController {
    constructor({ canvas, ctx, statusDisplay, queueScreen, gameScreen, playAgainButton }) {
        this.canvas = canvas
        this.ctx = ctx
        this.statusDisplay = statusDisplay
        this.queueScreen = queueScreen
        this.gameScreen = gameScreen
        this.playAgainButton = playAgainButton
        this.onMove = () => {} // replaced by GameApp once it owns a client

        this.amWhite = null // fixed for the life of a connection - assigned once, in the init message
        this.isFlipped = () => !this.amWhite // each connection has its own fixed seat now, not a shared screen that flips per turn
        this.lastMovedPiece = null
        this.render = () => {} // replaced once the first snapshot builds a real BoardView

        // Built once by initScreen(), on the connection's first snapshot -
        // torn down and rebuilt only on reset(), never per turn.
        this.dragMoveService = null
        this.pointerInputBinder = null
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

    // Called before a fresh connect() - clears the previous connection's
    // seat and highlight state so neither leaks into the new match, and
    // tears down the previous connection's drag wiring so initScreen() can
    // build a clean one rather than stacking listeners onto the same canvas.
    reset() {
        this.amWhite = null
        this.lastMovedPiece = null
        this.render = () => {}
        this.pointerInputBinder?.destroy()
        this.pointerInputBinder = null
        this.dragMoveService = null
    }

    applyInit({ white, board, game, movedPieceId }) {
        this.amWhite = white
        this.showGame()
        this.initScreen({ board, game, movedPieceId })
    }

    applyUpdate({ board, game, movedPieceId, reason }) {
        this.refreshScreen({ board, game, movedPieceId, reason })
    }

    // Builds the parts of the graph that only need to exist once per
    // connection: the drag-gesture wiring, and - inside it - the
    // PointerInputBinder's canvas/window listeners. Called once, from
    // applyInit(); everything turn-specific still comes from refreshScreen().
    initScreen({ board, game, movedPieceId }) {
        const coordinateMapper = new BoardCoordinateMapper(this.canvas, board) // board dimensions are fixed for the game, only piece positions change

        this.dragMoveService = new DragMoveService(piece => piece.white === this.amWhite)
        const dragController = new DragController(
            this.dragMoveService,
            snapshot => this.renderSnapshot(snapshot),
            (pieceId, position) => this.onMove(pieceId, position)
        )
        this.pointerInputBinder = new PointerInputBinder(this.canvas, coordinateMapper, dragController, this.isFlipped)

        this.refreshScreen({ board, game, movedPieceId })
    }

    // Board/Game are wholesale replacements every turn (there's no in-place
    // mutation across the wire), and MoveCalculator holds its board by
    // reference, so the move/capture calculators and the renderer/view built
    // from them still get rebuilt every turn - but only repoint the
    // already-built dragMoveService at the new state, rather than rebuilding
    // DragController/PointerInputBinder and re-wiring the canvas's listeners.
    refreshScreen({ board, game, movedPieceId, reason = null }) {
        this.lastMovedPiece = movedPieceId ? board.getPieceById(movedPieceId) : null

        const moveService = new MoveCalculator(board)
        const captureService = new CaptureService(moveService)
        const renderer = new Renderer(moveService)

        const view = new BoardView(game, board, renderer, this.canvas, this.ctx, this.statusDisplay, captureService, this.isFlipped, reason)
        this.render = snapshot => view.render(snapshot)

        this.dragMoveService.update(game, board, moveService, captureService)

        this.renderSnapshot()
        if (game.isOver) this.playAgainButton.classList.remove("hidden")
    }

    renderSnapshot(gestureSnapshot = { selectedPiece: null, captureTarget: null }) {
        this.render({ ...gestureSnapshot, lastMovedPiece: this.lastMovedPiece })
    }
}
