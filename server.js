import { serveDir } from "https://deno.land/std/http/file_server.ts";
import { MatchGateway } from "./backend/interface/MatchGateway.js";
import { MatchQueue } from "./backend/service/MatchQueue.js";
import { MatchRegistry } from "./backend/service/MatchRegistry.js";
import { GameSessionFactory } from "./backend/service/GameSessionFactory.js";

// Every /ws connection joins a FIFO matchmaking queue and is paired off
// automatically, invisibly, as soon as a second player is waiting - see
// MatchGateway, which is where a socket stops being a socket, and
// client-server-plan.md / websockets-plan.md, which left a room lobby
// (multiple concurrent boards) "deliberately out of scope for now". This is
// that lobby, minus any user-facing room id or create/join step: matching is
// driven purely by queue length.
const gateway = new MatchGateway(new MatchQueue(), new MatchRegistry(), new GameSessionFactory());

async function handle(req) {
    const { pathname } = new URL(req.url);

    if (pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
        const { socket, response } = Deno.upgradeWebSocket(req);
        gateway.join(socket);
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
