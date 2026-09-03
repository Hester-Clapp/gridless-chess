import { assertEquals, assertAlmostEquals } from "@std/assert"
import { Line } from "./Line.js"
import { Circle } from "./Circle.js"

Deno.test("intersectLine() returns the two intersection distances when the line passes through the circle", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
    const circle = new Circle({ x: 5, y: 0 }, 2)

    const result = circle.intersectLine(line)
    assertAlmostEquals(result.lambda1, 3)
    assertAlmostEquals(result.lambda2, 7)
})

Deno.test("intersectLine() returns null when the line misses the circle entirely", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
    const circle = new Circle({ x: 5, y: 10 }, 2)

    assertEquals(circle.intersectLine(line), null)
})

Deno.test("intersectLine() returns null when the line is exactly tangent to the circle", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
    const circle = new Circle({ x: 5, y: 2 }, 2)

    assertEquals(circle.intersectLine(line), null)
})

Deno.test("intersectLine() returns the two intersection distances even if they lie beyond the line segment", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 2, y: 0 })
    const circle = new Circle({ x: 5, y: 0 }, 2)

    const result = circle.intersectLine(line)
    assertAlmostEquals(result.lambda1, 3)
    assertAlmostEquals(result.lambda2, 7)
})

Deno.test("containsPoint() is true for a point strictly inside the circle", () => {
    const circle = new Circle({ x: 0, y: 0 }, 5)
    assertEquals(circle.containsPoint({ x: 1, y: 1 }), true)
})

Deno.test("containsPoint() is true for a point exactly on the boundary", () => {
    const circle = new Circle({ x: 0, y: 0 }, 5)
    assertEquals(circle.containsPoint({ x: 5, y: 0 }), true)
})

Deno.test("containsPoint() is false for a point outside the circle", () => {
    const circle = new Circle({ x: 0, y: 0 }, 5)
    assertEquals(circle.containsPoint({ x: 6, y: 0 }), false)
})
