// A minimal fake WebSocket - just enough of the addEventListener/send
// interface the backend's interface/ classes rely on, with `sent` recording
// what it was told to send and emit() letting a test fire
// "open"/"message"/"close" as needed. Shared by MatchQueue.test.js,
// MatchServer.test.js and MatchRegistry.test.js now that sendMessage()'s
// readyState guard needs the same fake in more than one place.
//
// Defaults to WebSocket.OPEN (already-connected), matching how these tests
// mostly want to reason about a settled connection; override readyState to
// WebSocket.CONNECTING to exercise sendMessage()'s deferred-until-open path.
export const makeSocket = ({ readyState = WebSocket.OPEN } = {}) => {
    const listeners = {}
    return {
        sent: [],
        closed: false,
        readyState,
        addEventListener(type, handler) {
            (listeners[type] ??= []).push(handler)
        },
        send(data) { this.sent.push(JSON.parse(data)) },
        close() { this.closed = true },
        emit(type, event) { for (const handler of listeners[type] ?? []) handler(event) },
    }
}
