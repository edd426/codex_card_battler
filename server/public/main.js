const { useState, useEffect } = React;

function App() {
  const [gameState, setGameState] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAttacker, setSelectedAttacker] = useState(null);
  // load status definitions for hover tooltips
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    startGame();
  }, []);
  // fetch status definitions (charge, taunt)
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

  const startGame = async () => {
    const res = await fetch('/api/game/start', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    setGameId(data.gameId);
    setGameState(data);
  };

  const playCard = async (cardId) => {
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
  
  const attack = async (attackerId, targetType, targetId) => {
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

  if (!gameState) return <div>Loading...</div>;

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
    error
  } = gameState;
  

  const endTurn = async () => {
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

  return (
    <div className="app">
      <div className="stats">
        <div>Player Health: {userHealth}</div>
        <div
          className={
            `ai-hero ${turn === 'user' && !over && selectedAttacker ? 'clickable' : ''}`
          }
          onClick={() => selectedAttacker && attack(selectedAttacker, 'hero', null)}
        >
          AI Health: {aiHealth}
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
          <h3>AI Board</h3>
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
          <button onClick={endTurn} disabled={loading}>End Turn</button>
        )}
        {turn === 'ai' && !over && <div>AI is taking its turn...</div>}
      </div>

      <div className="log">
        <h3>Game Log</h3>
        <div className="log-entries">
          {log.map((entry, idx) => (
            <div key={idx}>{entry}</div>
          ))}
        </div>
      </div>

      {over && (
        <div className="game-over">
          <h2>Game Over! {winner === 'user' ? 'You Win!' : 'You Lose!'}</h2>
          <button onClick={startGame}>Restart Game</button>
        </div>
      )}

    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));