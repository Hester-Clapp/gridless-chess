// Owns every currently in-progress match. MatchGateway builds one and hands
// it here; this tracks it under a private id purely so it can be torn down
// again once the match reports it's over, whether by a real win or a
// disconnect forfeit. The id is never sent to a client - it's bookkeeping,
// not a room concept.
//
// A match is an opaque thing with an onGameOver hook as far as this class is
// concerned; what it's made of, and which sockets it runs, belong to the
// layer above.
export class MatchRegistry {
    constructor() {
        this.matches = new Map()
    }

    track(match) {
        const id = crypto.randomUUID()
        this.matches.set(id, match)
        match.onGameOver = () => this.matches.delete(id)
        return match
    }

    get size() {
        return this.matches.size
    }
}
