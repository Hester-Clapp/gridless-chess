export class BoardCoordinateMapper {
    constructor(canvas, board) {
        this.canvas = canvas
        this.board = board
    }

    toBoardPoint(event, flipped) {
        const rect = this.canvas.getBoundingClientRect()
        const scaleX = this.canvas.width / rect.width
        const scaleY = this.canvas.height / rect.height
        const point = {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        }
        return flipped ? this.board.mirror(point) : point
    }
}