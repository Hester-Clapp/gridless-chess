import { assertAlmostEquals, assertEquals } from "@std/assert"
import { Line } from "./Line.js"
import { Rectangle } from "./Rectangle.js"

Deno.test("clip() returns the same line when fully inside the rectangle", () => {
    const rectangle = new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 })

    const line = new Line({ x: 1, y: 1 }, { x: 5, y: 1 })
    assertEquals(rectangle.clip(line), line)
})

Deno.test("clip() returns undefined when fully outside the rectangle", () => {
    const rectangle = new Rectangle({ x: 0, y: -100 }, { x: 10, y: 100 })

    const line = new Line({ x: 20, y: 0 }, { x: 30, y: 0 })
    assertEquals(rectangle.clip(line), undefined)
})

Deno.test("clip() returns undefined when a horizontal line lies entirely outside a parallel boundary", () => {
    const rectangle = new Rectangle({ x: -100, y: -10 }, { x: 100, y: 10 })

    const line = new Line({ x: 0, y: -50 }, { x: 5, y: -50 })
    assertEquals(rectangle.clip(line), undefined)
})

Deno.test("clip() clips a line that exits through one side", () => {
    const rectangle = new Rectangle({ x: 0, y: -100 }, { x: 10, y: 100 })

    const clipped = rectangle.clip(new Line({ x: -5, y: 0 }, { x: 5, y: 0 }))
    assertAlmostEquals(clipped.from.x, 0)
    assertAlmostEquals(clipped.from.y, 0)
    assertAlmostEquals(clipped.to.x, 5)
    assertAlmostEquals(clipped.to.y, 0)
})

Deno.test("clip() clips a diagonal line against all four sides", () => {
    // Line from (-10, -10) to (10, 10) clipped to the box [-1, 1] x [-1, 1].
    const rectangle = new Rectangle({ x: -1, y: -1 }, { x: 1, y: 1 })

    const clipped = rectangle.clip(new Line({ x: -10, y: -10 }, { x: 10, y: 10 }))
    assertAlmostEquals(clipped.from.x, -1)
    assertAlmostEquals(clipped.from.y, -1)
    assertAlmostEquals(clipped.to.x, 1)
    assertAlmostEquals(clipped.to.y, 1)
})

Deno.test("clip() touching the boundary exactly is kept, not dropped", () => {
    const rectangle = new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 })

    const line = new Line({ x: 0, y: 0 }, { x: 10, y: 0 })
    assertEquals(rectangle.clip(line), line)
})

Deno.test("clip() collapses to a point without dropping it when the point is inside the rectangle", () => {
    // A zero-length line (from === to) is what a move option produces when
    // its min and max distances coincide.
    const rectangle = new Rectangle({ x: 0, y: 0 }, { x: 10, y: 10 })

    const point = { x: 5, y: 5 }
    const line = new Line(point, point)
    assertEquals(rectangle.clip(line), line)
})

Deno.test("inset() shrinks the rectangle by the margin on every side", () => {
    const inset = new Rectangle({ x: 0, y: 0 }, { x: 100, y: 80 }).inset(10)

    assertEquals(inset.topLeft, { x: 10, y: 10 })
    assertEquals(inset.bottomRight, { x: 90, y: 70 })
})
