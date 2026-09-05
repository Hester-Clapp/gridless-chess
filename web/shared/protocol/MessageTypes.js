// Wire message `type` strings shared by the server (backend/) and the
// browser client (web/frontend/). Centralised so a typo in a message type
// shows up as an import error rather than a silently-ignored unknown
// message on the other end of the socket.
export const MESSAGE = {
    INIT: "init",
    UPDATE: "update",
    REJECTED: "rejected",
    MAKE_MOVE: "makeMove",
    QUEUED: "queued",
}
