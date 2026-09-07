// Turns every incoming connection into automatic matchmaking instead of a
// fixed two-seat game: a connection joins a FIFO queue the instant it
// arrives, and as soon as a second one is waiting the two longest-waiting
// ones are paired off via onMatch and handed to whatever builds and tracks
// actual matches (see MatchGateway / MatchRegistry). There's no user-facing
// queue position or room concept - a connection is either waiting or
// already matched, and moves through that state exactly once. See
// client-server-plan.md / websockets-plan.md, which left a room lobby
// "deliberately out of scope for now" - this is that lobby, minus any
// user-facing room id or create/join step.
//
// The entries here are opaque handles, not sockets: telling a connection
// it's been queued, and noticing it has gone away, are the gateway's job
// above this - all that's left here is the ordering rule.
export class MatchQueue {
    constructor() {
        this.waiting = []
        this.onMatch = () => {} // replaced by MatchGateway once it can build matches
    }

    join(connection) {
        this.waiting.push(connection)
        this.tryMatch()
    }

    // A no-op if `connection` is already gone - either it was already
    // dequeued into a match (in which case this is just its now-irrelevant
    // queue-side close listener firing once the match itself later closes
    // the socket), or it's already been removed. Either way there's nothing
    // left to do, and nothing left dangling for a later tryMatch() to trip
    // over.
    leave(connection) {
        const index = this.waiting.indexOf(connection)
        if (index !== -1) this.waiting.splice(index, 1)
    }

    tryMatch() {
        if (this.waiting.length < 2) return
        const [a, b] = [this.waiting.shift(), this.waiting.shift()]
        this.onMatch(a, b)
    }
}
