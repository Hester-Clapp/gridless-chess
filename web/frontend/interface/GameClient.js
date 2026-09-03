// frontend/interface/GameClient.js
// Stand-in for a transport. Right now it calls the backend directly
// in-process; later the constructor takes a WebSocket connection and
// every method sends/awaits a message instead — callers never notice.
export class GameClient {
    constructor(gameSession) {
        this.gameSession = gameSession
    }

    async init() {
        return this.gameSession.init()
    }

    async makeMove(piece, position) {
        return this.gameSession.makeMove({ piece, position })
    }
}