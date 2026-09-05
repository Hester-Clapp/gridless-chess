import { serveDir } from "https://deno.land/std/http/file_server.ts";
import { Board } from "./web/shared/entity/Board.js";
import { Game } from "./web/shared/entity/Game.js";
import { MoveCalculator } from "./web/shared/service/MoveCalculator.js";
import { BoardSetupService } from "./backend/service/BoardSetupService.js";
import { CaptureService } from "./web/shared/service/CaptureService.js";
import { PromotionService } from "./backend/service/PromotionService.js";
import { MoveExecutionService } from "./backend/service/MoveExecutionService.js";
import { MoveValidator } from "./backend/service/MoveValidator.js";
import { GameSession } from "./backend/interface/GameSession.js";
import { GameSessionTransport } from "./backend/transport/GameSessionTransport.js";
import { MatchQueue } from "./backend/interface/MatchQueue.js";
import { MatchRegistry } from "./backend/interface/MatchRegistry.js";

// Every /ws connection joins a FIFO matchmaking queue and is paired off
// automatically, invisibly, as soon as a second player is waiting - see
// client-server-plan.md / websockets-plan.md, which left a room lobby
// (multiple concurrent boards) "deliberately out of scope for now". This is
// that lobby, minus any user-facing room id or create/join step: matching is
// driven purely by queue length. Each match gets its own fully isolated
// board via this same per-match construction recipe, run through however
// many times as there are matches, instead of once for the whole process.
function buildGameSession() {
    const board = new Board();
    new BoardSetupService().standardSetup(board);
    const game = new Game(board);
    const moveCalculator = new MoveCalculator(board);
    const gameSession = new GameSession(
        game,
        board,
        new MoveValidator(moveCalculator),
        new MoveExecutionService(moveCalculator, new CaptureService(moveCalculator), new PromotionService())
    );
    return { transport: new GameSessionTransport(gameSession, board), game };
}

const registry = new MatchRegistry(buildGameSession);
const queue = new MatchQueue((white, black) => registry.start(white, black));

async function handle(req) {
    const { pathname } = new URL(req.url);

    if (pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        queue.join(socket);
        return response;
    }

    // ---- Static files ----
    return serveDir(req, {
        fsRoot: "web",
        urlRoot: "",
    });
}

if (import.meta.main) {
    console.log("Starting server...")
    Deno.serve(handle, { port: Deno.env.get("PORT") });
}

// app.get('/', serveStatic({ path: "./web/index.html" }))
// app.get('/about', serveStatic({ path: "./web/about.html" }))
// app.get('/coding', serveStatic({ path: "./web/projects.html" }))
// app.get('/maps', serveStatic({ path: "./web/maps.html" }))