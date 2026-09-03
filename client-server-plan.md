### Client
Calculates possible moves
Receives user input
Calculates check

### Server
Board state
Whose turn it is
Score
Sets up the board initially
Applies incoming moves
Captures pieces
Manages promotion
Validates:
- is it your turn
- is the move legal

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