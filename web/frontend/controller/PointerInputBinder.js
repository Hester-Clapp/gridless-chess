export class PointerInputBinder {
    constructor(canvas, coordinateMapper, gesture, isFlipped) {
        this.canvas = canvas
        this.coordinateMapper = coordinateMapper
        this.gesture = gesture
        this.isFlipped = isFlipped

        canvas.addEventListener("pointerdown", e => this.onDown(e))
        window.addEventListener("pointermove", e => this.onMove(e))
        window.addEventListener("pointerup", e => this.onUp(e))
        window.addEventListener("pointercancel", () => this.gesture.cancel())
    }

    onDown(event) {
        event.preventDefault()
        this.canvas.setPointerCapture?.(event.pointerId)
        this.gesture.start(this.coordinateMapper.toBoardPoint(event, this.isFlipped()))
    }

    onMove(event) {
        this.gesture.update(this.coordinateMapper.toBoardPoint(event, this.isFlipped()), event.shiftKey)
    }

    onUp(event) {
        this.gesture.end(this.coordinateMapper.toBoardPoint(event, this.isFlipped()), event.shiftKey)
    }
}