import { Vector } from "./Vector.js"

export class Line {
    from
    to
    normal

    constructor(from, to) {
        this.from = from
        this.to = to
        this.normal = Vector.between(this.from, this.to).normalise()
    }

    get length() {
        return Vector.between(this.from, this.to).length
    }

    projectionDistance(point) {
        return Vector.between(this.from, point).dot(this.normal)
    }

    distanceTo(point) {
        const distance = this.projectionDistance(point)
        if (distance < 0) return Vector.between(this.from, point).length
        if (distance > this.length) return Vector.between(this.to, point).length
        
        const tangent = this.normal.perpendicular()
        return Math.abs(Vector.between(this.from, point).dot(tangent))
    }

    closestPoint(point) {
        const distance = this.projectionDistance(point)
        if (distance < 0) return { ...this.from }
        if (distance > this.length) return { ...this.to }
        
        return this.normal.times(distance).translate(this.from)
    }
}