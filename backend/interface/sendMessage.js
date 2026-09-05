// A freshly Deno.upgradeWebSocket()'d socket isn't guaranteed OPEN the
// instant it exists, and now more than one object (MatchQueue, and later
// MatchServer once a match starts) may each need to send it a first message
// at unpredictable times relative to its "open" event. One guarded send kept
// in one place is simpler than reasoning about event-loop ordering at each
// call site. A socket that's already past OPEN (closing/closed) just drops
// the message rather than throwing - better than crashing the server over a
// race with a concurrent disconnect.
export function sendMessage(socket, message) {
    const data = JSON.stringify(message)
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(data)
    } else if (socket.readyState === WebSocket.CONNECTING) {
        socket.addEventListener("open", () => socket.send(data), { once: true })
    }
}
