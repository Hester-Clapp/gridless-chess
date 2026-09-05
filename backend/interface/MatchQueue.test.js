import { assertEquals } from "@std/assert"
import { MESSAGE } from "../../web/shared/protocol/MessageTypes.js"
import { makeSocket } from "./testSupport/makeSocket.js"
import { MatchQueue } from "./MatchQueue.js"

Deno.test("join() sends a queued message to a lone connection and does not match it yet", () => {
    const matches = []
    const queue = new MatchQueue((a, b) => matches.push([a, b]))
    const a = makeSocket()

    queue.join(a)

    assertEquals(a.sent, [{ type: MESSAGE.QUEUED, payload: {} }])
    assertEquals(matches.length, 0)
})

Deno.test("join() matches the two longest-waiting sockets, in FIFO order, once a second joins", () => {
    const matches = []
    const queue = new MatchQueue((a, b) => matches.push([a, b]))
    const a = makeSocket()
    const b = makeSocket()

    queue.join(a)
    queue.join(b)

    assertEquals(matches, [[a, b]])
})

Deno.test("a third join() waits, and a fourth pairs the 3rd and 4th without touching the first pair", () => {
    const matches = []
    const queue = new MatchQueue((x, y) => matches.push([x, y]))
    const [a, b, c, d] = [makeSocket(), makeSocket(), makeSocket(), makeSocket()]

    queue.join(a)
    queue.join(b)
    queue.join(c)
    assertEquals(matches, [[a, b]])

    queue.join(d)
    assertEquals(matches, [[a, b], [c, d]])
})

Deno.test("closing a socket while still queued removes it with no dangling reference", () => {
    const matches = []
    const queue = new MatchQueue((x, y) => matches.push([x, y]))
    const a = makeSocket()
    const b = makeSocket()
    const c = makeSocket()

    queue.join(a)
    a.emit("close")
    queue.join(b)
    queue.join(c)

    assertEquals(matches, [[b, c]])
})

Deno.test("a matched socket's leftover queue-side close listener is a harmless no-op", () => {
    const matches = []
    const queue = new MatchQueue((x, y) => matches.push([x, y]))
    const a = makeSocket()
    const b = makeSocket()

    queue.join(a)
    queue.join(b) // a and b are matched and shifted out of the queue

    a.emit("close") // e.g. the match ending later and closing the socket
    const c = makeSocket()
    const d = makeSocket()
    queue.join(c)
    queue.join(d)

    assertEquals(matches, [[a, b], [c, d]]) // no crash, and a's stale close didn't re-touch the queue
})

Deno.test("sendMessage defers the queued message until the socket's open event if it isn't open yet", () => {
    const queue = new MatchQueue(() => {})
    const a = makeSocket({ readyState: WebSocket.CONNECTING })

    queue.join(a)
    assertEquals(a.sent, [])

    a.emit("open")
    assertEquals(a.sent, [{ type: MESSAGE.QUEUED, payload: {} }])
})
