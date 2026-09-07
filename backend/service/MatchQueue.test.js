import { assertEquals } from "@std/assert"
import { MatchQueue } from "./MatchQueue.js"

// The queue deals in opaque connection handles - whatever the gateway hands
// it - so these are just labelled objects. Nothing here knows about sockets.
const makeConnection = name => ({ name })

const makeQueue = () => {
    const matches = []
    const queue = new MatchQueue()
    queue.onMatch = (a, b) => matches.push([a, b])
    return { queue, matches }
}

Deno.test("join() does not match a lone connection", () => {
    const { queue, matches } = makeQueue()

    queue.join(makeConnection("a"))

    assertEquals(matches.length, 0)
})

Deno.test("join() matches the two longest-waiting connections, in FIFO order, once a second joins", () => {
    const { queue, matches } = makeQueue()
    const a = makeConnection("a")
    const b = makeConnection("b")

    queue.join(a)
    queue.join(b)

    assertEquals(matches, [[a, b]])
})

Deno.test("a third join() waits, and a fourth pairs the 3rd and 4th without touching the first pair", () => {
    const { queue, matches } = makeQueue()
    const [a, b, c, d] = ["a", "b", "c", "d"].map(makeConnection)

    queue.join(a)
    queue.join(b)
    queue.join(c)
    assertEquals(matches, [[a, b]])

    queue.join(d)
    assertEquals(matches, [[a, b], [c, d]])
})

Deno.test("leaving while still queued removes the connection with no dangling reference", () => {
    const { queue, matches } = makeQueue()
    const [a, b, c] = ["a", "b", "c"].map(makeConnection)

    queue.join(a)
    queue.leave(a)
    queue.join(b)
    queue.join(c)

    assertEquals(matches, [[b, c]])
})

Deno.test("a matched connection leaving later is a harmless no-op", () => {
    const { queue, matches } = makeQueue()
    const [a, b, c, d] = ["a", "b", "c", "d"].map(makeConnection)

    queue.join(a)
    queue.join(b) // a and b are matched and shifted out of the queue

    queue.leave(a) // e.g. the match ending later and closing the socket
    queue.join(c)
    queue.join(d)

    assertEquals(matches, [[a, b], [c, d]]) // no crash, and a's stale departure didn't re-touch the queue
})

Deno.test("onMatch defaults to a no-op, so a queue nobody has wired up still pairs safely", () => {
    const queue = new MatchQueue()

    queue.join(makeConnection("a"))
    queue.join(makeConnection("b"))

    assertEquals(queue.waiting, [])
})
