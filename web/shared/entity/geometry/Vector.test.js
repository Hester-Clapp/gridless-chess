import { assertEquals, assertAlmostEquals } from "@std/assert"
import { Vector } from "./Vector.js"

Deno.test("constructor stores x and y", () => {
    const v = new Vector(3, -4)
    assertEquals(v.x, 3)
    assertEquals(v.y, -4)
})

Deno.test("between() returns the vector from one point to another", () => {
    const v = Vector.between({ x: 1, y: 2 }, { x: 4, y: 6 })
    assertEquals(v.x, 3)
    assertEquals(v.y, 4)
})

Deno.test("between() is anti-symmetric", () => {
    const from = { x: 1, y: 2 }
    const to = { x: 4, y: 6 }
    const forward = Vector.between(from, to)
    const backward = Vector.between(to, from)
    assertEquals(forward.x, -backward.x)
    assertEquals(forward.y, -backward.y)
})

Deno.test("dot() computes the dot product", () => {
    const a = new Vector(1, 2)
    const b = new Vector(3, 4)
    assertEquals(a.dot(b), 1 * 3 + 2 * 4)
})

Deno.test("dot() of perpendicular vectors is zero", () => {
    const a = new Vector(2, 0)
    const b = new Vector(0, 5)
    assertEquals(a.dot(b), 0)
})

Deno.test("length computes the Euclidean length", () => {
    const v = new Vector(3, 4)
    assertEquals(v.length, 5)
})

Deno.test("length of a zero vector is zero", () => {
    const v = new Vector(0, 0)
    assertEquals(v.length, 0)
})

Deno.test("normalise() produces a unit vector in the same direction", () => {
    const v = new Vector(3, 4)
    const n = v.normalise()
    assertAlmostEquals(n.length, 1)
    assertAlmostEquals(n.x, 3 / 5)
    assertAlmostEquals(n.y, 4 / 5)
})

Deno.test("normalise() preserves direction (positive scalar multiple)", () => {
    const v = new Vector(-6, 8)
    const n = v.normalise()
    const k = v.length
    assertAlmostEquals(n.x * k, v.x)
    assertAlmostEquals(n.y * k, v.y)
})

Deno.test("normalise() of the zero vector is the zero vector", () => {
    const v = new Vector(0, 0)
    const n = v.normalise()
    assertAlmostEquals(n.length, 0)
    assertAlmostEquals(n.x, 0)
    assertAlmostEquals(n.y, 0)
})

Deno.test("perpendicular() rotates the vector by 90 degrees", () => {
    const v = new Vector(1, 0)
    const p = v.perpendicular()
    assertEquals(p.x, 0)
    assertEquals(p.y, -1)
})

Deno.test("perpendicular() result is orthogonal to the original", () => {
    const v = new Vector(5, -2)
    const p = v.perpendicular()
    assertEquals(v.dot(p), 0)
})

Deno.test("perpendicular() preserves length", () => {
    const v = new Vector(3, 4)
    assertAlmostEquals(v.perpendicular().length, v.length)
})

Deno.test("times() scales both components", () => {
    const v = new Vector(2, -3)
    const scaled = v.times(4)
    assertEquals(scaled.x, 8)
    assertEquals(scaled.y, -12)
})

Deno.test("times(0) collapses to the zero vector", () => {
    const v = new Vector(2, -3)
    const scaled = v.times(0)
    assertEquals(scaled.x, 0)
    assertEquals(scaled.y, 0)
})

Deno.test("translate() offsets a point by the vector", () => {
    const v = new Vector(2, 3)
    const result = v.translate({ x: 10, y: 10 })
    assertEquals(result, { x: 12, y: 13 })
})

Deno.test("translate() returns a plain point, not a Vector", () => {
    const v = new Vector(1, 1)
    const result = v.translate({ x: 0, y: 0 })
    assertEquals(result instanceof Vector, false)
})

Deno.test("translate() returns the same point if the vector is the zero vector", () => {
    const v = new Vector(0, 0)
    const result = v.translate({ x: 10, y: 10 })
    assertEquals(result, { x: 10, y: 10 })
})
