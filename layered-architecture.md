Code in this repo uses object-oriented programming with a layered architecture. Classes should only interact with classes on the layer above or below them. The layers are as follows:

# Entity classes

These classes represent in-game objects that ARE but do not DO. They keep track of the state of the game, but do not contain game or business logic. They should be kept as thin as possible. Despite the name, these objects are not persistent.

Geometry classes contain methods for calculating and interacting with each other. This is allowed. Other game entities may depend on geometry classes but not the other way around.

Entity classes may be instatiated multiple times. Controller, service and interface classes should only be instantiated once per game.

# Client/Frontend

### Controller

This layer is responsible for handling user interaction and display. Classes should be kept as thin as possible

This layer should control:
- rendering the board and pieces
- displaying possible moves
- handling click/drag interactions
- showing status information
- preventing some interactions (like piece movement) if it is not your turn/colour

This layer should NOT control:
- game logic
- interaction with server

### Service

This layer is responsible for game and business logic that takes place on the client side. This includes:
- calculating and validating possible moves
- identifying when the king is in check
- castling
- keeping track of whose turn it is

This layer should be the thickest

### Interface
 
This layer is all about interacting with the server. This includes:
- Requesting to join the game
- Receiving the initial game state
- Telling the server which moves the client is making
- Updating the client when the opponent makes a move
- Serialising and deserialising game entities

This should NOT process:
- game logic
- user interactions
- validation

Try to minimise the amount of data being sent over the websocket

### Transport

This layer should be merged with the interface layer since it has the same responsibilities

# Server/Backend

### Interface

This layer is all about interacting with the clients. This includes:
- Requesting to join the game
- Broadcasting the initial game state
- Updating the board when the clients make a move
- Serialising and deserialising game entities

This should NOT process:
- game logic
- validation

### Service

This layer is responsible for game and business logic that takes place on the client side. This includes:
- handling the matching queue
- adding new connections to the queue
- starting games when there are enough players in the queue
- keeping track of whose turn it is
- moving pieces
- pawn promotion
- tearing down and cleaning up games when they are won or forfeit

This layer should be the thickest

# Shared

This folder acts as an extension of the service and interface layers on the client and server to store code that they both need to access. Code that is only used on the client should be kept in the frontend folder and code that is only used on the server should be kept in the backend folder. The shared folder also stores entity classes

# Scripts

There are two scripts that are not object-oriented

main.js creates and wires the classes on the client-side
server.js creates and wires the classes on the server-side, and also handles incoming requests and websocket upgrades

Both of these scripts should be kept as thin as possible and should not involve any business logic