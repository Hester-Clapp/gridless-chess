export class Vector {
    x
    y

    constructor(x, y) {
        this.x = x
        this.y = y
    }

    static between(from, to) {
        return new Vector(to.x - from.x, to.y - from.y)
    }

    static fromAngle(r, theta) {
        return new Vector(r * Math.cos(theta), r * Math.sin(theta))
    }

    static random(standardDeviation) {
        const theta  = 2 * Math.PI * Math.random();
        const R   = Math.sqrt(-2 * Math.log(Math.random())) * standardDeviation;
        const x   = R * Math.cos(theta);
        const y   = R * Math.sin(theta);
        return new Vector(x, y);
    }

    dot(that) {
        return this.x * that.x + this.y * that.y
    }

    get length() {
        return Math.hypot(this.x, this.y)
    }

    normalise() {
        const m = this.length
        if (m === 0) return new Vector(0, 0)
        return new Vector(
            this.x / m, this.y / m
        )
    }

    perpendicular() {
        return new Vector(this.y, -this.x)
    }

    times(k) {
        return new Vector(
            this.x * k, this.y * k
        )
    }

    translate(point) {
        return {
            x: this.x + point.x,
            y: this.y + point.y
        }
    }
}