const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Game state tracking
const games = {};

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Create a new game room
  socket.on("createGame", () => {
    console.log("createGame");

    const gameId = Math.random().toString(36).substring(7);
    games[gameId] = {
      board: Array(9).fill(null),
      players: [socket.id],
      playerSymbols: {}, // Track player symbols
      currentPlayer: null,
      winner: null,
    };

    // Immediately add the first player's symbol
    games[gameId].playerSymbols[socket.id] = "X";

    console.log(`Game created: ${gameId} by ${socket.id}`);

    // Join the socket to the game room
    socket.join(gameId);

    socket.emit("gameCreated", {
      gameId: gameId,
      player: "X",
    });
  });

  // Join an existing game room
  socket.on("joinGame", (gameId) => {
    console.log(`Attempt to join game: ${gameId} by ${socket.id}`);

    // Validate game ID
    if (!gameId) {
      console.log("Invalid game ID");
      socket.emit("gameError", "Invalid game ID");
      return;
    }

    // Check if game exists
    if (!games[gameId]) {
      console.log(`Game not found: ${gameId}`);
      socket.emit("gameError", "Game not found");
      return;
    }

    // Check if game is full
    if (games[gameId].players.length >= 2) {
      console.log(`Game is full: ${gameId}`);
      socket.emit("gameError", "Game is already full");
      return;
    }

    // Add player to the game
    games[gameId].players.push(socket.id);

    // Assign player symbol
    games[gameId].playerSymbols[socket.id] = "O";

    // Join the game room
    socket.join(gameId);

    // Set first player as current player
    games[gameId].currentPlayer = games[gameId].players[0];

    // Get initial board state
    const gameState = {
      gameId,
      players: games[gameId].players,
      board: games[gameId].board,
      currentPlayer: games[gameId].currentPlayer,
      playerSymbols: games[gameId].playerSymbols,
    };

    // Broadcast to all players in the room
    io.to(gameId).emit("gameStarted", gameState);

    console.log(`Player ${socket.id} joined game: ${gameId}`);
  });

  // Handle player moves
  socket.on("makeMove", ({ gameId, index, player }) => {
    const game = games[gameId];

    if (game && game.board[index] === null) {
      game.board[index] = player;

      // Check for winner
      const winner = checkWinner(game.board);
      if (winner) {
        game.winner = winner;
        games[gameId] = {
          board: Array(9).fill(null),
          players: [socket.id],
          playerSymbols: {}, // Track player symbols
          currentPlayer: null,
          winner: null,
        };

        // Immediately add the first player's symbol
        games[gameId].playerSymbols[socket.id] = "X";

        console.log(`Game created: ${gameId} by ${socket.id}`);

        // Join the socket to the game room
        // socket.join(gameId);/

        io.to(gameId).emit("gameOver", { winner, gameId: gameId, player: "X" });
 
      
      } else {
        // Switch current player
        const currentPlayerIndex = game.players.indexOf(game.currentPlayer);
        game.currentPlayer = game.players[(currentPlayerIndex + 1) % 2];

        io.to(gameId).emit("moveMade", {
          board: game.board,
          currentPlayer: game.currentPlayer,
        });
      }
    }
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    for (const gameId in games) {
      const game = games[gameId];
      if (game.players.includes(socket.id)) {
        // delete games[gameId];
        // io.to(gameId).emit('playerLeft');
      }
    }
  });
});

// Check for winner
function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return board.every((cell) => cell !== null) ? "draw" : null;
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// const SOCKET_URL = 'http://172.16.1.175:5000';
