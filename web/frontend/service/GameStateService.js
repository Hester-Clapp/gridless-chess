import { MoveCalculator } from "./MoveCalculator.js"
import { CastlingService } from "./CastlingService.js"
import { CheckService } from "./CheckService.js"
import { CaptureService } from "../../shared/service/CaptureService.js"

// Everything the client knows about the match it's in, and every question
// about it the screen has to ask: which board and game state is current,
// which seat this connection plays, whose turn it is, what a piece may do,
// and what a drag gesture is allowed to resolve to.
//
// It is also where a move is decided in full before being sent. The server
// applies whatever it's told and works nothing out for itself, so a castle
// has to leave here already carrying the rook move that goes with it - see
// buildMove().
//
// It outlives any single turn. Board and Game are wholesale replacements
// every turn (there's no in-place mutation across the wire) and the
// calculators hold their board by reference, so those get rebuilt on each
// snapshot - but this service, and everything built on top of it (the drag
// wiring, the renderer, the piece layer), is built once per connection and
// simply repointed.
//
// Kept apart from the controller - which only draws what this reports and
// sequences pointer events - so "can this piece be picked up", "is the king
// in check", "where does this drag resolve to" are rules this service owns.
export class GameStateService {
    constructor() {
        this.castlingService = new CastlingService()
        this.captureService = new CaptureService()
        this.reset()
    }

    // Called before a fresh connection, so no part of the finished match
    // leaks into the next one.
    reset() {
        this.amWhite = null // fixed for the life of a connection - assigned once, from the init message
        this.game = null
        this.board = null
        this.moveCalculator = null
        this.checkService = null
        this.lastMovedPiece = null
        this.reason = null // the wire UPDATE's forfeit marker, if the game ended that way - see StatusDisplay
    }

    applyInit(snapshot) {
        this.amWhite = snapshot.white
        this.applyUpdate(snapshot)
    }

    applyUpdate({ board, game, movedPieceId, reason = null }) {
        this.board = board
        this.game = game
        this.moveCalculator = new MoveCalculator(board, this.castlingService)
        this.checkService = new CheckService(this.moveCalculator, this.captureService)
        // Resolved fresh against this snapshot's board rather than tracked
        // across gestures: a move only takes effect once the server's update
        // comes back, so the piece that moved is whichever one this board
        // says it was.
        this.lastMovedPiece = movedPieceId ? board.getPieceById(movedPieceId) : null
        this.reason = reason
    }

    get isOver() {
        return this.game.isOver
    }

    // Each connection has its own fixed seat, so the board is drawn from
    // black's side for black, rather than flipping per turn.
    get isFlipped() {
        return !this.amWhite
    }

    checkStatus() {
        return this.checkService.getCheckStatus(this.board, this.game.whiteToMove)
    }

    movesFor(piece) {
        return this.moveCalculator.calculateMoves(piece)
    }

    // A piece is selectable if there's one at `point`, it isn't already the
    // gesture's current selection, it belongs to this connection's seat,
    // and - the actual "not your turn" guard - Game.isTurn() agrees it's
    // that piece's colour's move right now.
    pieceSelectableAt(point, currentlySelected) {
        const piece = this.board.getPieceAt(point)
        return piece && piece !== currentlySelected && piece.white === this.amWhite && this.game.isTurn(piece) ? piece : null
    }

    dragLinesFor(piece) {
        return piece ? this.movesFor(piece) : null
    }

    destinationFor(dragLines, point) {
        return this.moveCalculator.closestLegalPoint(dragLines, point)
    }

    captureTargetAt(piece, destination) {
        return destination ? this.captureService.findCaptureAt(this.board, piece, destination) : null
    }

    // The move to send for a piece being dropped at `destination`: every
    // piece this move shifts, and where each one lands. Usually just the one
    // that was dragged; a castle adds the rook, since the server works
    // nothing out for itself. The dragged piece comes first - that's the one
    // whose move the board is judged by, and the one the "last moved"
    // highlight follows.
    //
    // Asked while the piece is still on its starting square, which is what
    // makes a castle recognisable at all.
    buildMove(piece, destination) {
        const moves = [{ pieceId: piece.id, position: destination }]

        const castle = this.castlingService.castleMoveFor(this.board, piece, destination)
        if (castle) moves.push({ pieceId: castle.piece.id, position: castle.position })

        return { moves }
    }
}
