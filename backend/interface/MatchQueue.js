import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { sendMessage } from "./sendMessage.js"

// Turns every /ws connection into automatic matchmaking instead of a fixed
// two-seat game: a socket joins a FIFO queue the instant it connects, and as
// soon as a second one is waiting the two longest-waiting sockets are paired
// off via onMatch and handed to whatever builds/tracks actual matches (see
// MatchRegistry). There's no user-facing queue position or room concept - a
// socket is either waiting or already matched, and moves through that state
// exactly once. See client-server-plan.md / websockets-plan.md, which left a
// room lobby "deliberately out of scope for now" - this is that lobby, minus
// any user-facing room id or create/join step.
export class MatchQueue {
    constructor(onMatch) {
        this.onMatch = onMatch
        this.waiting = []
    }

    join(socket) {
        const entry = { socket }
        this.waiting.push(entry)
        sendMessage(socket, { type: MESSAGE.QUEUED, payload: {} })
        socket.addEventListener("close", () => this.remove(entry))
        this.tryMatch()
    }

    // A no-op if `entry` is already gone - either it was already dequeued
    // into a match (in which case this is just its now-irrelevant queue-side
    // close listener firing once the match itself later closes the socket),
    // or it's already been removed. Either way there's nothing left to do,
    // and nothing left dangling for a later tryMatch() to trip over.
    remove(entry) {
        const index = this.waiting.indexOf(entry)
        if (index !== -1) this.waiting.splice(index, 1)
    }

    tryMatch() {
        if (this.waiting.length < 2) return
        const [a, b] = [this.waiting.shift(), this.waiting.shift()]
        this.onMatch(a.socket, b.socket)
    }
}
