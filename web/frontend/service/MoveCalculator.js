import { RADIUS } from "../../shared/entity/geometry/constants.js"
import { Rectangle } from "../../shared/entity/geometry/Rectangle.js"
import { ObstructionScanner } from "./ObstructionScanner.js"
import { CastlingService } from "./CastlingService.js"

// Anything shorter than this is a move that goes nowhere - what's left of a
// direction that was blocked at the piece's own feet.
const NEGLIGIBLE = 1e-6

// Turns a piece's move options - which directions, how far, and what each
// may do about enemies (see MoveOption) - into the lines it can actually
// travel along on this board: clipped to the playable area, and cut short
// wherever another piece is in the way.
//
// This class owns no rules of its own. Which directions a piece has comes
// from the piece, castling's extra ones from CastlingService, sweeping a
// line for obstructions from ObstructionScanner, and staying on the board
// from Rectangle. What's left here is applying those to each other, in
// order, and remembering the answer.
export class MoveCalculator {
    board
    playableArea
    scanner = new ObstructionScanner()
    castlingService
    // One board's worth of answers. A snapshot's board is never mutated -
    // each turn arrives as a wholesale replacement, with a fresh calculator
    // built for it (see GameStateService) - so nothing here can go stale
    // while it lives.
    moveCache = new Map()

    constructor(board, castlingService = new CastlingService()) {
        this.board = board
        this.castlingService = castlingService
        // A piece's centre can't leave the board, so the area it may move in
        // is the board inset by one piece radius.
        this.playableArea = new Rectangle({ x: 0, y: 0 }, { x: board.width, y: board.height }).inset(RADIUS)
    }

    calculateMoves(piece) {
        const cached = this.moveCache.get(piece)
        if (cached) return cached

        const options = [...piece.moveOptions, ...this.castlingService.castlingOptions(this.board, piece)]
        const lines = options.map(option => option.createLine(piece.position))
        const obstructions = this.scanner.obstructionsNear(this.board, piece, lines)

        const moves = options
            .flatMap((option, index) => this.movesAlong(lines[index], option, piece.canJump, obstructions))
            .filter(move => move.length > NEGLIGIBLE)

        this.moveCache.set(piece, moves)
        return moves
    }

    // The point on any of `lines` closest to `point` - used to snap an
    // arbitrary drag position onto the nearest legal destination.
    closestLegalPoint(lines, point) {
        let closest = null
        let closestDistance = Infinity
        for (const line of lines) {
            const distance = line.distanceTo(point)
            if (distance < closestDistance) {
                closestDistance = distance
                closest = line.closestPoint(point)
            }
        }
        return closest
    }

    // The stretches of one option's line the piece can actually stop on -
    // usually one, or several for a piece that jumps over what blocks it.
    movesAlong(line, option, canJump, allObstructions) {
        const clipped = this.playableArea.clip(line)
        if (!clipped) return [] // the line lies entirely off the board

        const obstructions = option.ignores.length === 0
            ? allObstructions
            : allObstructions.filter(obstruction => !option.ignores.includes(obstruction.piece))

        const intersections = this.scanner.findIntersections(clipped, obstructions)
        // A move that may not capture has to stop at the first enemy it
        // meets; any other may finish inside one, which is what taking it
        // means here.
        const maxEnemyDepth = option.forbidsCapture ? 0 : 1
        const segments = this.scanner.scanObstructions(clipped, intersections, maxEnemyDepth, canJump)

        if (!option.requiresCapture) return segments
        return segments.filter(segment => this.endsOnEnemy(segment, obstructions))
    }

    // Whether a segment finishes close enough to an enemy to take it. A
    // capture-only move - a pawn's diagonal - is no move at all otherwise,
    // including when something else cut it short before it got there.
    endsOnEnemy(segment, obstructions) {
        return obstructions.some(obstruction => !obstruction.friendly && obstruction.circle.containsPoint(segment.to))
    }
}
