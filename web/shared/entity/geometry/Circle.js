import { Vector } from "./Vector.js"

export class Circle {
    centre
    radius

    constructor(centre, radius) {
        this.centre = centre
        this.radius = radius
    }

    containsPoint(point) {
        return Vector.between(this.centre, point).length <= this.radius
    }

    intersectLine(line) {
        const displacement = Vector.between(line.from, this.centre)
        const dot = displacement.dot(line.normal)
        const discriminant = dot ** 2 + this.radius ** 2 - displacement.length ** 2
        if (discriminant <= 0) return null

        const lambda1 = dot - Math.sqrt(discriminant)
        const lambda2 = dot + Math.sqrt(discriminant)
        return { lambda1, lambda2 }
    }
}