import { Board } from "../../web/shared/entity/Board.js"
import { Game } from "../../web/shared/entity/Game.js"
import { CaptureService } from "../../web/shared/service/CaptureService.js"
import { BoardSetupService } from "./BoardSetupService.js"
import { PromotionService } from "./PromotionService.js"
import { MoveExecutionService } from "./MoveExecutionService.js"
import { GameSession } from "./GameSession.js"

// The recipe for one match's game state, run through once per match rather
// than once for the whole process - which is what makes every match fully
// isolated from every other. Kept here rather than in server.js because
// which services a game is assembled from is a rule about how a game works,
// not about how the process is started.
//
// There is no move calculation in here: working out what a piece may do,
// and what a castle involves, is the client's job, and the server applies
// what it's told (see GameSession). All it needs of its own is enough to
// know what a committed move did to the board.
export class GameSessionFactory {
    create() {
        const board = new Board()
        new BoardSetupService().standardSetup(board)

        return new GameSession(
            new Game(board),
            board,
            new MoveExecutionService(new CaptureService(), new PromotionService())
        )
    }
}
