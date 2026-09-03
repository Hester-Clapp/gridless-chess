import { Line } from "./geometry/Line.js"

export class MoveSet {
    minDistance
    maxDistance
    directions = []
    canJump

    constructor(minDistance, maxDistance, directions, canJump = false) {
        this.minDistance = minDistance
        this.maxDistance = maxDistance
        this.directions = [...directions]
        this.canJump = canJump
    }

    createLines(origin) {
        return this.directions.map(vector => {
            const from = vector.times(this.minDistance).translate(origin)
            const to = vector.times(this.maxDistance).translate(origin)
            return new Line(from, to)
        })
    }
}