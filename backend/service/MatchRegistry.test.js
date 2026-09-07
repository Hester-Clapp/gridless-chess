import { assertEquals } from "@std/assert"
import { MatchRegistry } from "./MatchRegistry.js"

// A match is opaque to the registry - all it needs is somewhere to hang the
// game-over hook it wires up.
const makeMatch = () => ({ onGameOver: () => {} })

Deno.test("track() stores the match and hands it back", () => {
    const registry = new MatchRegistry()
    const match = makeMatch()

    assertEquals(registry.track(match), match)
    assertEquals(registry.size, 1)
})

Deno.test("each tracked match is held separately", () => {
    const registry = new MatchRegistry()

    registry.track(makeMatch())
    registry.track(makeMatch())

    assertEquals(registry.size, 2)
})

Deno.test("the registry evicts a match once it reports game-over", () => {
    const registry = new MatchRegistry()
    const first = registry.track(makeMatch())
    registry.track(makeMatch())

    first.onGameOver()

    assertEquals(registry.size, 1)
})

Deno.test("a match reporting game-over twice evicts it once and leaves the rest alone", () => {
    const registry = new MatchRegistry()
    const match = registry.track(makeMatch())
    registry.track(makeMatch())

    match.onGameOver()
    match.onGameOver()

    assertEquals(registry.size, 1)
})
