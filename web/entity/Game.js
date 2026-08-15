import { CaptureService } from "../service/CaptureService.js"

// Owns whose turn it is. Kept separate from Board - which only knows about
// piece positions - because turn order is a rule of the match, not a
// property of the board itself.
export class Game {
    board
    whiteToMove = true
    captureService = new CaptureService()

    constructor(board) {
        this.board = board
    }

    // Whether `piece` is allowed to move right now.
    isTurn(piece) {
        return piece.white === this.whiteToMove
    }

    advanceTurn() {
        this.whiteToMove = !this.whiteToMove
    }

    // The king belonging to whoever is next to move, plus whichever enemy
    // pieces currently threaten it. `threats` is empty (and only then) when
    // that player isn't in check - that's what "in check" means here.
    getCheckStatus() {
        const king = this.board.getKing(this.whiteToMove)
        const threats = king ? this.captureService.findThreateningPieces(this.board, king) : []
        return { king, threats }
    }
}
