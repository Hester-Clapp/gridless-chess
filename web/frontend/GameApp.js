import { GameClient } from "./interface/GameClient.js"

// Owns the lifecycle of one /ws connection: opening it, wrapping it in a
// GameClient, and routing each message type to the screen controller.
// connect() is called once at page load, and again from playAgain() -
// each call is a brand new connection, which the server always treats as a
// fresh queue join, so there's no server-side "leave match, rejoin queue"
// step to coordinate.
export class GameApp {
    constructor(screenController, createTransport) {
        this.screenController = screenController
        this.createTransport = createTransport
        this.client = null // replaced each time connect() runs - once at load, and again on "Play again"

        // The only way a drag attempt on the screen reaches the network -
        // wired once here, against whichever client is current at the time
        // it actually fires.
        screenController.onMove = (pieceId, position) => this.client.makeMove(pieceId, position)
    }

    connect() {
        this.client = new GameClient(this.createTransport())

        this.client.onQueued(() => {
            // The queueing screen is already showing by default (see this
            // class's callers) - nothing else to do until a match arrives
            // as an init.
        })

        this.client.onInit(payload => this.screenController.applyInit(payload))
        this.client.onUpdate(payload => this.screenController.applyUpdate(payload))
        this.client.onRejected(({ reason }) => {
            console.warn("Move rejected:", reason)
            this.screenController.applyRejectedMove()
        })
    }

    // The finished match's server-side MatchServer.handleClose() is a no-op
    // once its game is already over (see MatchServer.js), so closing this
    // socket is safe - it doesn't trigger a forfeit, it just lets the old
    // connection go before opening a fresh one to queue up again.
    playAgain() {
        this.client.transport.socket.close()
        this.screenController.showQueue()
        this.screenController.reset()
        this.connect()
    }
}
