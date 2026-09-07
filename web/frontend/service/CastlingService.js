import { Vector } from "../../shared/entity/geometry/Vector.js"
import { Line } from "../../shared/entity/geometry/Line.js"
import { Circle } from "../../shared/entity/geometry/Circle.js"
import { SPACE, RADIUS } from "../../shared/entity/geometry/constants.js"
import { MoveOption, CAPTURE } from "../../shared/entity/MoveOption.js"

// How far the king travels when it castles.
const KING_TRAVEL = 2 * SPACE

// Castling is the one move that has to land on a particular spot rather than
// anywhere along a line: two spaces exactly, give or take this much. The
// gap it leaves between an ordinary one-space king move and a castle is
// deliberate - without it there'd be no way to tell a long king move from a
// castle, and every drag past one space would castle by accident.
const TOLERANCE = 1

// Matches MoveCalculator/ObstructionScanner: two pieces are in each other's
// way once their centres are within two radii.
const OBSTRUCTION_RADIUS = RADIUS * 2

// The two directions a king can castle in - along its own rank, left toward
// the queen-side rook or right toward the king-side one.
const DIRECTIONS = [new Vector(-1, 0), new Vector(1, 0)]

// Castling, both halves of it: the extra move it gives the king (asked for
// by MoveCalculator, which has no idea castling exists beyond calling this)
// and the rook move that has to happen alongside it (asked for by
// GameStateService when a drag commits to that king move).
//
// Castling is decided entirely here, on the client: the server is told which
// rook moved where and simply applies it, exactly as it does the king's own
// move, and never works any of this out for itself. That's why this service
// reports the rook's move rather than performing it - by the time anything
// is moved, the board this ran against has already been replaced by the
// server's answer.
//
// The rule here: neither king nor rook may have moved, and the two spaces
// the king crosses must be clear of everything except that rook. Whatever
// stands between the king's destination and the rook is not in the way -
// the rook jumps over the king to reach its own square rather than sliding
// there, so it never sweeps that stretch.
export class CastlingService {

    // The castling moves available to `piece` on top of its ordinary ones -
    // none at all unless it's a king that can still castle, at most one per
    // side otherwise. Each is a short stretch of board centred two spaces
    // out, not a slide: the king may stop there or within a space of home,
    // but nowhere in between.
    castlingOptions(board, piece) {
        return this.castleCandidates(board, piece).map(({ option }) => option)
    }

    // The rook move that goes with a king being committed to `destination` -
    // which rook, and where it lands - or null when the move isn't a castle
    // at all. Must be asked while the king is still on its starting square:
    // which castle this is (if any) is decided by where the king started.
    //
    // Whether this drop is a castle is settled by asking the castle's own
    // line whether the point lies on it, rather than by measuring how far
    // the king travelled and comparing that against the same bounds the line
    // was built from. Those bounds are exactly the ends of the stretch, so a
    // drop on either end - which is where most castles land, the stretch
    // being two units long - would sit precisely on the comparison's
    // boundary, and floating-point rounding, not chess, would decide whether
    // the rook came along.
    castleMoveFor(board, king, destination) {
        const candidate = this.castleCandidates(board, king)
            .find(({ option }) => option.createLine(king.position).distanceTo(destination) < TOLERANCE)
        if (!candidate) return null

        const rook = candidate.rook
        return { piece: rook, position: { x: rook.position.x + this.rookTravel(king, rook), y: rook.position.y } }
    }

    // Each castle this king can still play: the rook it would move, and the
    // stretch of board the king may stop on to play it. One list, used both
    // to offer the move and to recognise it once it's been made, so the two
    // can never disagree about what counts as a castle.
    //
    // Each stretch is centred two spaces out and is a short stretch, not a
    // slide: the king may stop there or within a space of home, but nowhere
    // in between.
    castleCandidates(board, king) {
        if (king.type !== "king" || king.hasMoved) return []

        return DIRECTIONS
            .map(direction => ({ direction, rook: this.rookFor(board, king, direction) }))
            .filter(({ rook }) => rook)
            // The rook is left out of the sweep this option gets: it's the
            // one piece the king is allowed to end up alongside, and its own
            // square is close enough to the far edge of the tolerance to
            // otherwise trim the castle short of it.
            .map(({ direction, rook }) => ({
                direction,
                rook,
                option: new MoveOption(direction, KING_TRAVEL - TOLERANCE, KING_TRAVEL + TOLERANCE, CAPTURE.FORBIDDEN, [rook]),
            }))
    }

    // The rook this king would castle with in `direction`, or null if that
    // side offers no castle - no rook that has stayed put, or something
    // standing in the king's way.
    rookFor(board, king, direction) {
        const rook = this.unmovedRook(board, king, direction)
        if (!rook) return null
        return this.pathIsClear(board, king, direction, rook) ? rook : null
    }

    unmovedRook(board, king, direction) {
        const candidates = board.getFriendlyPieces(king)
            .filter(piece => piece.type === "rook" && !piece.hasMoved)
            .filter(rook => Math.sign(rook.position.x - king.position.x) === direction.x)

        // The outermost one, so a rook that has somehow ended up between the
        // king and its corner rook can't be mistaken for the castling one.
        return candidates.sort((a, b) =>
            Math.abs(b.position.x - king.position.x) - Math.abs(a.position.x - king.position.x))[0] ?? null
    }

    // Whether the king can actually cross those two spaces: only the rook it
    // is castling with is allowed to overlap them.
    pathIsClear(board, king, direction, rook) {
        const path = new Line(king.position, direction.times(KING_TRAVEL).translate(king.position))
        return board.getOtherPieces(king)
            .filter(piece => piece !== rook)
            .every(piece => !this.obstructs(piece, path))
    }

    obstructs(piece, path) {
        const intersection = new Circle(piece.position, OBSTRUCTION_RADIUS).intersectLine(path)
        if (!intersection) return false
        return intersection.lambda1 <= path.length && intersection.lambda2 >= 0
    }

    // How far the rook jumps, as a signed distance along the rank. It ends
    // one space the other side of the king's starting square, which - from
    // the standard opening position - is three whole spaces for the
    // queen-side rook (four spaces out) and two for the king-side one (three
    // out). Rounding to whole spaces keeps that exact despite the random
    // deviation every piece is set up with.
    //
    // That lands it on the one space the king crosses without stopping on,
    // which pathIsClear() has already found empty - so the rook can never
    // arrive on top of another piece, and needs no capture check of its own.
    rookTravel(king, rook) {
        const gap = rook.position.x - king.position.x
        const spaces = Math.round(Math.abs(gap) / SPACE) - 1
        return -Math.sign(gap) * spaces * SPACE
    }
}
