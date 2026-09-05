import { MatchServer } from "./MatchServer.js"

// Owns every currently in-progress match. MatchQueue calls start() with two
// already-paired sockets; this builds a fresh, fully isolated
// Board/Game/GameSession/GameSessionTransport (via the injected
// buildGameSession - server.js's per-match construction recipe) and a
// MatchServer to run them, then tracks the result under a private id purely
// so it can be torn down again once the match reports it's over, whether by
// a real win or a disconnect forfeit. The id is never sent to a client -
// it's bookkeeping, not a room concept.
export class MatchRegistry {
    constructor(buildGameSession) {
        this.buildGameSession = buildGameSession
        this.matches = new Map()
    }

    start(whiteSocket, blackSocket) {
        const id = crypto.randomUUID()
        const { transport, game } = this.buildGameSession()
        const match = new MatchServer(transport, game, () => this.matches.delete(id))

        this.matches.set(id, match)
        match.start(whiteSocket, blackSocket)
        return match
    }

    get size() {
        return this.matches.size
    }
}
