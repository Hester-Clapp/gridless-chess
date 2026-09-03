import { assertEquals, assertAlmostEquals } from "@std/assert"
import { Line } from "./Line.js"

Deno.test("constructor stores from and to", () => {
    const from = { x: 0, y: 0 }
    const to = { x: 4, y: 0 }
    const line = new Line(from, to)
    assertEquals(line.from, from)
    assertEquals(line.to, to)
})

Deno.test("constructor derives a unit normal along the from->to direction", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 3, y: 4 })
    assertAlmostEquals(line.normal.length, 1)
    assertAlmostEquals(line.normal.x, 3 / 5)
    assertAlmostEquals(line.normal.y, 4 / 5)
})

Deno.test("length returns the distance between from and to", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 3, y: 4 })
    assertEquals(line.length, 5)
})

Deno.test("length is zero when from and to coincide", () => {
    const point = { x: 2, y: 2 }
    const line = new Line(point, point)
    assertEquals(line.length, 0)
})

Deno.test("distanceTo() measures perpendicular distance when the point projects within the segment", () => {
    // Horizontal line along y = 0.
    const line = new Line({ x: 0, y: 0 }, { x: 4, y: 0 })
    assertEquals(line.distanceTo({ x: 2, y: 3 }), 3)
    assertEquals(line.distanceTo({ x: 2, y: -3 }), 3)
})

Deno.test("distanceTo() measures distance to 'from' when the point projects before the segment", () => {
    // Horizontal line along y = 0; point projects to x = -3, before "from".
    const line = new Line({ x: 0, y: 0 }, { x: 4, y: 0 })
    assertEquals(line.distanceTo({ x: -3, y: 4 }), 5)
})

Deno.test("distanceTo() measures distance to 'to' when the point projects beyond the segment", () => {
    // Horizontal line along y = 0; point projects to x = 7, beyond "to".
    const line = new Line({ x: 0, y: 0 }, { x: 4, y: 0 })
    assertEquals(line.distanceTo({ x: 7, y: 4 }), 5)
})

Deno.test("distanceTo() is zero for points on the segment itself", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 4, y: 0 })
    assertAlmostEquals(line.distanceTo({ x: 2, y: 0 }), 0)
    assertAlmostEquals(line.distanceTo({ x: 7, y: 0 }), 3)
})

Deno.test("distanceTo() works for a diagonal line", () => {
    // Line along y = x; point (2, 0) is distance sqrt(2) from it.
    const line = new Line({ x: 0, y: 0 }, { x: 3, y: 3 })
    assertAlmostEquals(line.distanceTo({ x: 2, y: 0 }), Math.SQRT2)
})

Deno.test("closestPoint() projects a point onto the line segment", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 4, y: 0 })
    const closest = line.closestPoint({ x: 2, y: 3 })
    assertAlmostEquals(closest.x, 2)
    assertAlmostEquals(closest.y, 0)
})

Deno.test("closestPoint() returns the point itself when already on the line", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 4, y: 0 })
    const closest = line.closestPoint({ x: 3, y: 0 })
    assertAlmostEquals(closest.x, 3)
    assertAlmostEquals(closest.y, 0)
})

Deno.test("closestPoint() does not extrapolate beyond the segment's endpoints", () => {
    const line = new Line({ x: 0, y: 0 }, { x: 1, y: 0 })
    const closest = line.closestPoint({ x: 2, y: 1 })
    assertAlmostEquals(closest.x, 1)
    assertAlmostEquals(closest.y, 0)
})
