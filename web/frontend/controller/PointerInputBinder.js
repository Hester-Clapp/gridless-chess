export class PointerInputBinder {
    constructor(canvas, coordinateMapper, gesture, isFlipped) {
        this.canvas = canvas
        this.coordinateMapper = coordinateMapper
        this.gesture = gesture
        this.isFlipped = isFlipped

        this.handleDown = e => this.onDown(e)
        this.handleMove = e => this.onMove(e)
        this.handleUp = e => this.onUp(e)
        this.handleCancel = () => this.gesture.cancel()

        canvas.addEventListener("pointerdown", this.handleDown)
        window.addEventListener("pointermove", this.handleMove)
        window.addEventListener("pointerup", this.handleUp)
        window.addEventListener("pointercancel", this.handleCancel)
    }

    // buildScreen() rebuilds the whole graph - including a fresh
    // PointerInputBinder - on every snapshot, but the canvas itself persists
    // across the connection. Without this, each rebuild's listeners would
    // stack on top of the previous ones instead of replacing them.
    destroy() {
        this.canvas.removeEventListener("pointerdown", this.handleDown)
        window.removeEventListener("pointermove", this.handleMove)
        window.removeEventListener("pointerup", this.handleUp)
        window.removeEventListener("pointercancel", this.handleCancel)
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