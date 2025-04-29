const { useState, useEffect } = React;

function App() {
  // Game mode - null for mode selection, 'ai' for AI game, 'pvp' for multiplayer
  const [gameMode, setGameMode] = useState(null);
  const [nickname, setNickname] = useState('');
  
  // Game state
  const [gameState, setGameState] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  const [statuses, setStatuses] = useState([]);
  
  // PvP specific state
  const [inQueue, setInQueue] = useState(false);
  const [socket, setSocket] = useState(null);
  const [pvpError, setPvpError] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  
  // Load statuses on mount
  useEffect(() => {
    fetch('/statuses.json')
      .then(res => res.json())
      .then(data => setStatuses(data || []))
      .catch(() => {});
  }, []);
  
  // Reset selected attacker when turn changes
  useEffect(() => {
    setSelectedAttacker(null);
  }, [gameState?.turn]);
  
  // Clear error messages after a delay
  useEffect(() => {
    if (pvpError) {
      const timer = setTimeout(() => {
        setPvpError(null);
      }, 3000); // Clear PvP errors after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [pvpError]);
  
  // Clear game error messages when turn changes or after a delay
  useEffect(() => {
    if (gameState?.error) {
      const timer = setTimeout(() => {
        // Create a new game state without the error
        setGameState(prevState => ({
          ...prevState,
          error: null
        }));
      }, 3000); // Clear game errors after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState?.error]);
  
  // Clear errors when turn changes
  useEffect(() => {
    if (gameState?.turn) {
      // Clear both types of errors when a new turn starts
      setPvpError(null);
      
      if (gameState.error) {
        setGameState(prevState => ({
          ...prevState,
          error: null
        }));
      }
    }
  }, [gameState?.turn]);
  
  // Initialize Socket.io for PvP mode
  useEffect(() => {
    if (gameMode === 'pvp' && !socket) {
      const newSocket = io();
      
      // Set up socket event handlers
      newSocket.on('waitingForOpponent', () => {
        setInQueue(true);
      });
      
      newSocket.on('gameStart', (data) => {
        setInQueue(false);
        setGameId(data.gameId);
        setGameState(adaptPvPState(data));
      });
      
      newSocket.on('gameUpdate', (data) => {
        // Add the current gameId to the data to ensure it's preserved
        data.gameId = gameId;
        setGameState(adaptPvPState(data));
        setLoading(false);
      });
      
      newSocket.on('error', (error) => {
        setPvpError(error.message);
        setLoading(false);
      });
      
      newSocket.on('opponentDisconnected', () => {
        setOpponentDisconnected(true);
      });
      
      newSocket.on('leftQueue', () => {
        setInQueue(false);
      });
      
      setSocket(newSocket);
      
      // Clean up
      return () => {
        newSocket.disconnect();
      };
    }
  }, [gameMode]);
  
  // Helper to convert PvP state to the format used by the UI
  const adaptPvPState = (pvpState) => {
    const playerNumber = pvpState.playerNumber || 1;
    
    // If we're player 1
    if (playerNumber === 1) {
      return {
        userHealth: pvpState.player1Health,
        aiHealth: pvpState.player2Health,
        userHand: pvpState.player1Hand,
        userBoard: pvpState.player1Board,
        aiBoard: pvpState.player2Board,
        currentUserMana: pvpState.player1CurrentMana,
        maxUserMana: pvpState.player1MaxMana,
        turn: pvpState.turn === 1 ? 'user' : 'ai',
        turnCount: pvpState.turnCount,
        log: pvpState.log,
        over: pvpState.over,
        winner: pvpState.winner === 1 ? 'user' : 'ai',
        opponentName: pvpState.player2Name || pvpState.opponentNickname || 'Opponent',
        isPvP: true,
        playerNumber,
        gameId: pvpState.gameId
      };
    } 
    // If we're player 2
    else {
      return {
        userHealth: pvpState.player2Health,
        aiHealth: pvpState.player1Health,
        userHand: pvpState.player2Hand,
        userBoard: pvpState.player2Board,
        aiBoard: pvpState.player1Board,
        currentUserMana: pvpState.player2CurrentMana,
        maxUserMana: pvpState.player2MaxMana,
        turn: pvpState.turn === 2 ? 'user' : 'ai',
        turnCount: pvpState.turnCount,
        log: pvpState.log,
        over: pvpState.over,
        winner: pvpState.winner === 2 ? 'user' : 'ai',
        opponentName: pvpState.player1Name || pvpState.opponentNickname || 'Opponent',
        isPvP: true,
        playerNumber,
        gameId: pvpState.gameId
      };
    }
  };
  
  // AI Game methods
  const startAIGame = async () => {
    // Clear any existing errors
    setPvpError(null);
    
    setLoading(true);
    const res = await fetch('/api/game/start', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' } 
    });
    const data = await res.json();
    setGameId(data.gameId);
    setGameState(data);
    setLoading(false);
  };
  
  const playCardAI = async (cardId) => {
    if (loading || gameState.over || gameState.turn !== 'user') return;
    setLoading(true);
    const res = await fetch(`/api/game/${gameId}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId })
    });
    const data = await res.json();
    setGameState(data);
    setLoading(false);
  };
  
  const attackAI = async (attackerId, targetType, targetId) => {
    if (loading || !selectedAttacker || gameState.over || gameState.turn !== 'user') return;
    setLoading(true);
    const res = await fetch(`/api/game/${gameId}/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attackerId, targetType, targetId })
    });
    const data = await res.json();
    setGameState(data);
    setSelectedAttacker(null);
    setLoading(false);
  };
  
  const endTurnAI = async () => {
    if (loading || gameState.over || gameState.turn !== 'user') return;
    setLoading(true);
    const res = await fetch(`/api/game/${gameId}/end-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    setGameState(data);
    setLoading(false);
  };
  
  // PvP Game methods
  const joinQueue = () => {
    if (!socket) return;
    socket.emit('joinQueue', nickname);
  };
  
  const leaveQueue = () => {
    if (!socket) return;
    socket.emit('leaveQueue');
  };
  
  const playCardPvP = (cardId) => {
    if (loading || gameState.over || gameState.turn !== 'user' || !socket) return;
    
    // Use gameId from state as a fallback if the top-level gameId is not set
    const currentGameId = gameId || gameState.gameId;
    if (!currentGameId) {
      setPvpError("Game ID not found. Please restart the game.");
      return;
    }
    
    setLoading(true);
    socket.emit('playCard', { gameId: currentGameId, cardId });
  };
  
  const attackPvP = (attackerId, targetType, targetId) => {
    if (loading || !selectedAttacker || gameState.over || gameState.turn !== 'user' || !socket) return;
    
    // Use gameId from state as a fallback if the top-level gameId is not set
    const currentGameId = gameId || gameState.gameId;
    if (!currentGameId) {
      setPvpError("Game ID not found. Please restart the game.");
      return;
    }
    
    setLoading(true);
    socket.emit('attack', { gameId: currentGameId, attackerId, targetType, targetId });
    setSelectedAttacker(null);
  };
  
  const endTurnPvP = () => {
    if (loading || gameState.over || gameState.turn !== 'user' || !socket) return;
    
    // Use gameId from state as a fallback if the top-level gameId is not set
    const currentGameId = gameId || gameState.gameId;
    if (!currentGameId) {
      setPvpError("Game ID not found. Please restart the game.");
      return;
    }
    
    setLoading(true);
    socket.emit('endTurn', { gameId: currentGameId });
  };
  
  // Generic game actions based on mode
  const playCard = (cardId) => {
    // Clear any existing errors
    setPvpError(null);
    if (gameState?.error) {
      setGameState(prevState => ({
        ...prevState,
        error: null
      }));
    }
    
    if (gameMode === 'pvp') {
      playCardPvP(cardId);
    } else {
      playCardAI(cardId);
    }
  };
  
  const attack = (attackerId, targetType, targetId) => {
    // Clear any existing errors
    setPvpError(null);
    if (gameState?.error) {
      setGameState(prevState => ({
        ...prevState,
        error: null
      }));
    }
    
    if (gameMode === 'pvp') {
      attackPvP(attackerId, targetType, targetId);
    } else {
      attackAI(attackerId, targetType, targetId);
    }
  };
  
  const endTurn = () => {
    // Clear any existing errors
    setPvpError(null);
    if (gameState?.error) {
      setGameState(prevState => ({
        ...prevState,
        error: null
      }));
    }
    
    if (gameMode === 'pvp') {
      endTurnPvP();
    } else {
      endTurnAI();
    }
  };
  
  const restartGame = () => {
    setGameState(null);
    setGameId(null);
    setSelectedAttacker(null);
    setPvpError(null);
    setOpponentDisconnected(false);
    setInQueue(false);
    
    if (gameMode === 'ai') {
      startAIGame();
    } else {
      // For PvP, we need to clean up the socket connection
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setGameMode(null); // Return to mode selection
    }
  };
  
  const returnToMenu = () => {
    setGameState(null);
    setGameId(null);
    setSelectedAttacker(null);
    setPvpError(null);
    setOpponentDisconnected(false);
    setInQueue(false);
    
    // Make sure to clean up socket connection when returning to menu
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    setGameMode(null);
  };
  
  // Game mode selection screen
  if (!gameMode) {
    return (
      <div className="game-mode-selection">
        <h1>Card Battler Game</h1>
        <div className="mode-buttons">
          <button onClick={() => {
            setGameMode('ai');
            startAIGame();
          }}>Play vs AI</button>
          
          <div className="pvp-section">
            <h2>Play vs Another Player</h2>
            <input 
              type="text" 
              placeholder="Enter your nickname" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button 
              onClick={() => setGameMode('pvp')}
              disabled={!nickname}
            >
              Play Online
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // PvP matchmaking screen
  if (gameMode === 'pvp' && !gameState) {
    return (
      <div className="matchmaking">
        <h2>Online Matchmaking</h2>
        {inQueue ? (
          <>
            <p>Waiting for opponent...</p>
            <button onClick={leaveQueue}>Cancel</button>
          </>
        ) : (
          <>
            <p>Press the button to find an opponent</p>
            <button onClick={joinQueue}>Find Match</button>
            <button onClick={() => setGameMode(null)}>Back</button>
          </>
        )}
      </div>
    );
  }
  
  // Loading screen
  if (!gameState) return <div>Loading...</div>;
  
  // Game screen
  const {
    userHealth,
    aiHealth,
    userHand,
    userBoard,
    aiBoard,
    currentUserMana,
    maxUserMana,
    turn,
    log,
    over,
    winner,
    error,
    isPvP,
    opponentName
  } = gameState;
  
  const opponentTitle = isPvP ? opponentName : 'AI';
  
  return (
    <div className="app">
      {/* Display PvP error or disconnection messages */}
      {pvpError && <div className="error">{pvpError}</div>}
      {opponentDisconnected && (
        <div className="game-over">
          <h2>Opponent Disconnected!</h2>
          <button onClick={restartGame}>Back to Menu</button>
        </div>
      )}
      
      <div className="stats">
        <div>Your Health: {userHealth}</div>
        <div
          className={
            `ai-hero ${turn === 'user' && !over && selectedAttacker ? 'clickable' : ''}`
          }
          onClick={() => selectedAttacker && attack(selectedAttacker, 'hero', null)}
        >
          {opponentTitle} Health: {aiHealth}
        </div>
        <div>Mana: {currentUserMana}/{maxUserMana}</div>
      </div>
      
      {/* Display error message when action fails (e.g., not enough mana) */}
      {error && <div className="error">{error}</div>}

      <div className="board">
      <div className="board-section">
        <h3>Your Board</h3>
        <div className="board-cards">
          {userBoard.map((card, idx) => {
            const sleeping = card.summonedThisTurn && !card.charge;
            const disabled = card.hasAttacked || sleeping;
            const selected = selectedAttacker === card.id;
            // Build tooltip with full stats and abilities
            const abilityText = statuses
              .filter(s => card[s.id])
              .map(s => `${s.name}: ${s.description}`)
              .join('; ');
            const titleText = `Cost: ${card.manaCost} | ATK: ${card.attack} | HP: ${card.currentHealth}` +
              (abilityText ? ` | ${abilityText}` : '');
            return (
              <div
                key={idx}
                className={`card ${sleeping ? 'sleeping' : ''}` +
                  ` ${turn === 'user' && !over && !disabled ? 'clickable' : ''}` +
                  ` ${disabled ? 'disabled' : ''}` +
                  ` ${selected ? 'selected' : ''}`}
                title={titleText}
                onClick={() => {
                  if (turn === 'user' && !over && !disabled) setSelectedAttacker(card.id);
                }}
              >
              {/* Cost badge */}
              <span className="card-cost">{card.manaCost}</span>
              {card.image && <img src={card.image} alt={card.name} />}
              {/* Card title and statuses */}
              <div className="card-title">
                {card.name}
                {statuses.filter(s => card[s.id]).map(s => (
                  <span
                    key={s.id}
                    className={`status ${s.id}`}
                    title={`${s.name}: ${s.description}`}
                  >{s.name}</span>
                ))}
              </div>
              {/* Attack and Health badges */}
              <span className="card-attack">{card.attack}</span>
              <span className="card-health">{card.currentHealth}</span>
              </div>
            );
          })}
        </div>
      </div>
        <div className="board-section">
          <h3>{opponentTitle} Board</h3>
          <div className="board-cards">
        {aiBoard.map((card, idx) => {
              // Build tooltip with full stats and abilities
              const abilityText = statuses
                .filter(s => card[s.id])
                .map(s => `${s.name}: ${s.description}`)
                .join('; ');
              const titleText = `Cost: ${card.manaCost} | ATK: ${card.attack} | HP: ${card.currentHealth}` +
                (abilityText ? ` | ${abilityText}` : '');
              return (
                <div
                  key={idx}
                  className={`card ${turn === 'user' && !over && selectedAttacker ? 'clickable' : ''}`}
                  title={titleText}
                  onClick={() => selectedAttacker && attack(selectedAttacker, 'creature', card.id)}
                >
                  {/* Cost badge */}
                  <span className="card-cost">{card.manaCost}</span>
              {/* Card image */}
              {card.image && <img src={card.image} alt={card.name} />}
              {/* Card name and statuses */}
                  <div className="card-title">
                    {card.name}
                    {statuses.filter(s => card[s.id]).map(s => (
                      <span
                        key={s.id}
                        className={`status ${s.id}`}
                        title={`${s.name}: ${s.description}`}
                      >{s.name}</span>
                    ))}
                  </div>
                  {/* Attack and Health badges */}
                  <span className="card-attack">{card.attack}</span>
                  <span className="card-health">{card.currentHealth}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hand">
        <h3>Your Hand</h3>
        {userHand.map(card => {
          const canPlay = turn === 'user' && !over && card.manaCost <= currentUserMana;
          const disabled = turn === 'user' && !over && !canPlay;
          // Build tooltip with full stats and abilities
          const abilityText = statuses
            .filter(s => card[s.id])
            .map(s => `${s.name}: ${s.description}`)
            .join('; ');
          const baseText = card.spell
            ? card.description
            : `ATK ${card.attack} | HP ${card.health}`;
          const titleText = `Cost: ${card.manaCost} | ${baseText}` +
            (abilityText ? ` | ${abilityText}` : '');
          return (
            <div
              key={card.id}
              className={`card${canPlay ? ' playable clickable' : ''}` +
                         `${disabled ? ' disabled' : ''}`}
              onClick={() => canPlay && playCard(card.id)}
              title={titleText}
            >
              {/* Cost badge */}
              <span className="card-cost">{card.manaCost}</span>
              {/* Card image */}
              {card.image && <img src={card.image} alt={card.name} />}
              {/* Card title and statuses */}
              <div className="card-title">
                {card.name}
                {statuses.filter(s => card[s.id]).map(s => (
                  <span
                    key={s.id}
                    className={`status ${s.id}`}
                    title={`${s.name}: ${s.description}`}
                  >{s.name}</span>
                ))}
              </div>
              {/* Attack and Health badges (only for creatures) */}
              {!card.spell && (
                <>
                  <span className="card-attack">{card.attack}</span>
                  <span className="card-health">{card.health}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="actions">
        {turn === 'user' && !over && (
          <>
            <button onClick={endTurn} disabled={loading}>End Turn</button>
            {gameMode === 'ai' && (
              <button onClick={returnToMenu} className="menu-button">Back to Menu</button>
            )}
          </>
        )}
        {turn === 'ai' && !over && (
          <>
            <div>{isPvP ? `Waiting for ${opponentName}...` : 'AI is taking its turn...'}</div>
            {gameMode === 'ai' && (
              <button onClick={returnToMenu} className="menu-button">Back to Menu</button>
            )}
          </>
        )}
      </div>

      <div className="log">
        <h3>Game Log</h3>
        <div className="log-entries">
          {log.map((entry, idx) => (
            <div key={idx}>{entry}</div>
          ))}
        </div>
      </div>

      {over && !opponentDisconnected && (
        <div className="game-over">
          <h2>Game Over! {winner === 'user' ? 'You Win!' : 'You Lose!'}</h2>
          <button onClick={restartGame}>
            {gameMode === 'ai' ? 'Restart Game' : 'Back to Menu'}
          </button>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));