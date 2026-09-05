### Client
Calculates possible moves
Receives user input
Calculates check

### Server
Board state
Whose turn it is
Score
Sets up the board initially
Applies incoming moves as sent, untrusted (client-authoritative: the
server no longer validates whose turn it is or whether a move is legal -
it just applies whatever the client says and relays it to the other player)
Captures pieces
Manages promotion

### Client to server
Make move:
- piece
- position

### Server to client
Init:
- board state
- turn

Update move:
- board state
- turn