// Decides what a drag gesture is allowed to do, in terms of the shared
// domain services (MoveCalculator, CaptureService) and Game's own turn
// rule. Kept apart from DragController - which only sequences pointer
// events into a DragGesture - so "can this piece be picked up", "where does
// this drag resolve to", and "does it land on a capture" are business rules
// this service owns, not the controller.
//
// Outlives any single turn - GameScreenController builds one of these per
// connection, alongside the DragController/PointerInputBinder it feeds, and
// repoints it at each turn's wholesale-replacement Board/Game/MoveCalculator/
// CaptureService via update() rather than being reconstructed itself.
export class DragMoveService {
    constructor(isMyPiece) {
        this.isMyPiece = isMyPiece
        this.game = null
        this.board = null
        this.moveService = null
        this.captureService = null
    }

    update(game, board, moveService, captureService) {
        this.game = game
        this.board = board
        this.moveService = moveService
        this.captureService = captureService
    }

    // A piece is selectable if there's one at `point`, it isn't already the
    // gesture's current selection, it belongs to this connection's seat,
    // and - the actual "not your turn" guard - Game.isTurn() agrees it's
    // that piece's colour's move right now.
    pieceSelectableAt(point, currentlySelected) {
        const piece = this.board.getPieceAt(point)
        return piece && piece !== currentlySelected && this.isMyPiece(piece) && this.game.isTurn(piece) ? piece : null
    }

    dragLinesFor(piece) {
        return piece ? this.moveService.calculateMoves(piece) : null
    }

    destinationFor(dragLines, point) {
        return this.moveService.closestLegalPoint(dragLines, point)
    }

    captureTargetAt(piece, destination) {
        return destination ? this.captureService.findCaptureAt(this.board, piece, destination) : null
    }
}
