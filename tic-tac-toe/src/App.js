import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

// IMPORTANT: Replace with your actual server IP
const SOCKET_URL = 'http://192.168.193.105:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [gameId, setGameId] = useState('');
  const [board, setBoard] = useState(Array(9).fill(null));
  const [player, setPlayer] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [gameStatus, setGameStatus] = useState('initial');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputGameId, setInputGameId] = useState('');
  const [, setPlayerSymbols] = useState({});

  useEffect(() => {
    // Connect to socket
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setErrorMessage('');
    });

    newSocket.on('gameCreated', (data) => {
      console.log('Game created with ID:', data.gameId);
      setGameId(data.gameId);
      setPlayer(data.player);
      setGameStatus('waiting_for_player');
      setErrorMessage('');
    });

    newSocket.on('gameStarted', (data) => {
      console.log('Game started:', data);
      setGameId(data.gameId);
      
      // Set player symbol based on socket ID
      const playerSymbol = data.playerSymbols[newSocket.id];
      setPlayer(playerSymbol);
      
      // Set player symbols map
      setPlayerSymbols(data.playerSymbols);
      
      // Set initial board state
      setBoard(data.board || Array(9).fill(null));
      
      // Set current player
      setCurrentPlayer(data.currentPlayer);
      
      setGameStatus('playing');
      setErrorMessage('');
    });

    newSocket.on('gameError', (error) => {
      console.error('Game Error:', error);
      setErrorMessage(error);
      setGameStatus('initial');
    });

    newSocket.on('moveMade', (data) => {
      setBoard(data.board);
      setCurrentPlayer(data.currentPlayer);
    });

    newSocket.on('gameOver', (data) => {
      setGameStatus('game_over');
      alert(data.winner === 'draw' ? 'Draw!' : `Player ${data.winner} wins!`);
      setGameId(data.gameId);
      
      // Set player symbol based on socket ID
      const playerSymbol = data.playerSymbols[newSocket.id];
      setPlayer(playerSymbol);
      
      // Set player symbols map
      setPlayerSymbols(data.playerSymbols);
      
      // Set initial board state
      setBoard(Array(9).fill(null));
      
      // Set current player
      setCurrentPlayer(data.currentPlayer);
      
      setGameStatus('playing');
    });

    return () => newSocket.close();
  }, []);

  const createGame = () => {
    if (socket) {
      console.log('Attempting to create game');
      socket.emit('createGame');
      setGameStatus('waiting');
    } else {
      setErrorMessage('Socket not connected. Please refresh.');
    }
  };

  const joinGame = () => {
    if (!inputGameId.trim()) {
      setErrorMessage('Please enter a Game ID');
      return;
    }

    if (socket) {
      console.log('Attempting to join game:', inputGameId);
      socket.emit('joinGame', inputGameId.trim());
    } else {
      setErrorMessage('Socket not connected. Please refresh.');
    }
  };

  const handleCellClick = (index) => {
    if (
      board[index] || 
      gameStatus !== 'playing' || 
      socket.id !== currentPlayer
    ) return;

    socket.emit('makeMove', { 
      gameId, 
      index, 
      player 
    });
  };

  const renderBoard = () => {
    return board.map((cell, index) => (
      <div 
        key={index} 
        onClick={() => handleCellClick(index)}
        style={{
          width: '100px', 
          height: '100px', 
          border: '1px solid black',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '48px',
          cursor: 'pointer',
          backgroundColor: cell ? (cell === 'X' ? '#e0f0ff' : '#ffe0e0') : 'white'
        }}
      >
        {cell}
      </div>
    ));
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Multiplayer</h1>
      
      {/* Initial Game Setup */}
      {gameStatus === 'initial' && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={createGame}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Create Game
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Enter Game ID" 
                value={inputGameId}
                onChange={(e) => setInputGameId(e.target.value)}
                style={{
                  padding: '10px',
                  fontSize: '16px',
                  width: '200px',
                  border: '1px solid #ccc',
                  borderRadius: '5px'
                }}
              />
              <button 
                onClick={joinGame}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for Player */}
      {gameStatus === 'waiting_for_player' && (
        <div style={{ textAlign: 'center' }}>
          <p>Game Created Successfully!</p>
          <p>Game ID: <strong>{gameId}</strong></p>
          <p>Waiting for another player to join...</p>
        </div>
      )}

      {/* Game in Progress */}
      {gameStatus === 'playing' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '10px' 
          }}>
            <p>Game ID: {gameId}</p>
            <p>Your Symbol: {player}</p>
            <p>
              Current Turn: {' '}
              {currentPlayer === socket.id 
                ? 'Your Turn' 
                : 'Opponent\'s Turn'}
            </p>
          </div>

          <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '5px',
            marginTop: '20px'
          }}>
            {renderBoard()}
          </div>
        </div>
      )}

      {/* Error Display */}
      {errorMessage && (
        <div style={{
          color: 'red',
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#ffeeee',
          border: '1px solid red',
          borderRadius: '5px'
        }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default App;