// Reflects match state that isn't drawn on the board itself - whose turn it
// is, and whether they're in check - into a plain DOM element. Kept apart
// from Renderer, which only ever touches the canvas.
export class StatusDisplay {
    element

    constructor(element) {
        this.element = element
    }

    // `checkStatus` is whatever CaptureService.getCheckStatus() returned
    // for the player currently on the move. Ignored once the game is over,
    // since "in check" is meaningless after a king's already been taken.
    update(game, checkStatus) {
        this.element.classList.toggle("winner", game.isOver)

        if (game.isOver) {
            this.element.textContent = `${game.winner ? "White" : "Black"} wins!`
            this.element.classList.remove("check")
            return
        }

        const colour = game.whiteToMove ? "White" : "Black"
        const inCheck = checkStatus.threats.length > 0

        this.element.textContent = inCheck ? `${colour} to move — in check` : `${colour} to move`
        this.element.classList.toggle("check", inCheck)
    }
}
