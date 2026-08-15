// Reflects match state that isn't drawn on the board itself - whose turn it
// is, and whether they're in check - into a plain DOM element. Kept apart
// from Renderer, which only ever touches the canvas.
export class StatusDisplay {
    element

    constructor(element) {
        this.element = element
    }

    // `checkStatus` is whatever CaptureService.getCheckStatus() returned
    // for the player currently on the move.
    update(game, checkStatus) {
        const colour = game.whiteToMove ? "White" : "Black"
        const inCheck = checkStatus.threats.length > 0

        this.element.textContent = inCheck ? `${colour} to move — in check` : `${colour} to move`
        this.element.classList.toggle("check", inCheck)
    }
}
