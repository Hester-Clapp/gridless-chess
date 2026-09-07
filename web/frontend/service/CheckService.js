// Whether a king is in check, and which enemy pieces are putting it there.
// Purely a client question: nothing on the server ever asks it - check
// changes nothing about what a move does, it only changes how the board
// reads - so the whole of it lives here, alongside the move calculation it
// depends on.
export class CheckService {
    constructor(moveCalculator, captureService) {
        this.moveCalculator = moveCalculator
        this.captureService = captureService
    }

    // The king belonging to `white`, plus whichever enemy pieces currently
    // threaten it. `threats` is empty (and only then) when that player
    // isn't in check - that's what "in check" means here. Deciding this
    // means walking every enemy piece's legal moves, which is calculation
    // Game shouldn't have to own.
    getCheckStatus(board, white) {
        const king = board.getKing(white)
        const threats = king ? this.findThreateningPieces(board, king) : []
        return { king, threats }
    }

    // Enemy pieces that could capture `piece` right now, i.e. whose legal
    // moves reach within capture distance of its square. Used to detect
    // check by calling with a king as `piece`.
    findThreateningPieces(board, piece) {
        return board.getEnemyPieces(piece).filter(enemy =>
            this.moveCalculator.calculateMoves(enemy).some(line =>
                this.captureService.intersectsPoint(line.closestPoint(piece.position), piece)
            )
        )
    }
}
