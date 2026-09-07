import { GameClient } from "../interface/GameClient.js"

// Owns the lifecycle of one /ws connection: opening it, and routing each
// message type into the match state below it and the screen above it.
// connect() is called once at page load, and again from playAgain() - each
// call is a brand new connection, which the server always treats as a fresh
// queue join, so there's no server-side "leave match, rejoin queue" step to
// coordinate.
//
// Every wire payload stops here: the controller is only ever told that
// something changed, never handed a message.
export class GameApp {
    constructor(screenController, gameState, createClient = () => GameClient.open()) {
        this.screenController = screenController
        this.gameState = gameState
        this.createClient = createClient
        this.client = null // replaced each time connect() runs - once at load, and again on "Play again"

        // The only two ways the screen reaches back out - wired once here,
        // against whichever client is current at the time they actually fire.
        screenController.onMove = move => this.client.makeMove(move)
        screenController.onPlayAgain = () => this.playAgain()
    }

    connect() {
        this.client = this.createClient()

        this.client.onQueued(() => {
            // The queueing screen is already showing by default (see this
            // class's callers) - nothing else to do until a match arrives
            // as an init.
        })

        this.client.onInit(snapshot => {
            this.gameState.applyInit(snapshot)
            this.screenController.startMatch()
        })

        this.client.onUpdate(snapshot => {
            this.gameState.applyUpdate(snapshot)
            this.screenController.refresh()
        })

        this.client.onRejected(({ reason }) => {
            console.warn("Move rejected:", reason)
            this.screenController.applyRejectedMove()
        })
    }

    // The finished match's server-side MatchServer.handleClose() forfeits
    // nothing once its game is already over (see MatchServer.js), so closing
    // this connection is safe - it doesn't trigger a forfeit, it just lets
    // the old one go before opening a fresh one to queue up again.
    playAgain() {
        this.client.disconnect()
        this.gameState.reset()
        this.screenController.showQueue()
        this.screenController.reset()
        this.connect()
    }
}
