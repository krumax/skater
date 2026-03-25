import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import {
  calculateGameValue,
  getOutcomeLabel,
  SUIT_LABELS,
  SUIT_SYMBOLS,
} from '../lib/skatScoring';

const GameScoringEntry = () => {
  const navigate = useNavigate();
  const { players, addRound, currentRound, rounds, getPlayerRank } = useGame();

  // ── Form State ──
  const [activePlayer, setActivePlayer] = useState(players[0]);
  const [gameType, setGameType] = useState('spade');
  const [hand, setHand] = useState(false);
  const [schneider, setSchneider] = useState(false);
  const [schwarz, setSchwarz] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [mitOhne, setMitOhne] = useState('mit');
  const [spitzen, setSpitzen] = useState(1);
  const [eyeCount, setEyeCount] = useState(61);

  // ── Auto-calculate result ──
  const result = useMemo(() => {
    try {
      return calculateGameValue({
        gameType,
        spitzen,
        hand,
        schneider,
        schneiderAnnounced: false,
        schwarz,
        schwarzAnnounced: false,
        ouvert,
        eyeCount: gameType === 'null' ? (eyeCount === 0 ? 0 : 1) : eyeCount,
      });
    } catch {
      return null;
    }
  }, [gameType, spitzen, hand, schneider, schwarz, ouvert, eyeCount]);

  const outcomeLabel = useMemo(() => {
    if (gameType === 'null') return eyeCount === 0 ? 'Null gewonnen' : 'Null verloren';
    return getOutcomeLabel(eyeCount);
  }, [gameType, eyeCount]);

  // ── Form Reset ──
  const resetForm = () => {
    setGameType('spade');
    setHand(false);
    setSchneider(false);
    setSchwarz(false);
    setOuvert(false);
    setMitOhne('mit');
    setSpitzen(1);
    setEyeCount(61);
    // Rotate to next player
    const currentIndex = players.indexOf(activePlayer);
    setActivePlayer(players[(currentIndex + 1) % players.length]);
  };

  // ── Commit ──
  const handleCommit = () => {
    if (!result) return;

    const typeLabel = SUIT_LABELS[gameType]
      + (hand ? ' Hand' : '')
      + (schneider ? ' Schneider' : '')
      + (schwarz ? ' Schwarz' : '')
      + (ouvert ? ' Ouvert' : '');

    addRound({
      player: activePlayer,
      gameType,
      typeLabel,
      gameValue: result.gameValue,
      baseValue: result.baseValue,
      multiplier: result.multiplier,
      won: result.won,
      eyeCount,
      spitzen,
      hand,
      schneider,
      schwarz,
      ouvert,
    });

    resetForm();
  };

  // ── Recent History (last 3 rounds) ──
  const recentRounds = rounds.slice(-3).reverse();

  // ── Max Spitzen by game type ──
  const maxSpitzen = gameType === 'grand' ? 4 : ['club', 'spade', 'heart', 'diamond'].includes(gameType) ? 11 : 1;

  const rankings = getPlayerRank();

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">New Game Result</h1>
        <p className="page-subtitle">Round {currentRound} — Capture the score for this round.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem' }}>
        <div>
          {/* ── Player Selection ── */}
          <section className="form-section">
            <label className="section-label">Who played this round?</label>
            <div className="player-grid">
              {players.map(name => (
                <button 
                  key={name}
                  onClick={() => setActivePlayer(name)}
                  className={`player-card ${activePlayer === name ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>person</span>
                  <span style={{ fontWeight: 700 }}>{name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Game Type ── */}
          <section className="form-section">
            <label className="section-label">Game Type</label>
            <div className="game-type-grid">
              {[
                { key: 'club',    icon: '♣', label: 'Kreuz',  activeClass: '' },
                { key: 'spade',   icon: '♠', label: 'Pik',    activeClass: '' },
                { key: 'heart',   icon: '♥', label: 'Herz',   activeClass: 'active-suit-heart' },
                { key: 'diamond', icon: '♦', label: 'Karo',   activeClass: 'active-suit-diamond' },
                { key: 'grand',   icon: null, label: 'Grand',  activeClass: '', matIcon: 'stars' },
                { key: 'null',    icon: null, label: 'Null',   activeClass: '', matIcon: 'block' },
              ].map(suit => (
                <button
                  key={suit.key}
                  onClick={() => {
                    setGameType(suit.key);
                    if (suit.key === 'null') { setSpitzen(1); setMitOhne('mit'); }
                    if (suit.key === 'grand' && spitzen > 4) setSpitzen(4);
                  }}
                  className={`game-type-card ${gameType === suit.key ? `active ${suit.activeClass}` : ''}`}
                >
                  {suit.icon
                    ? <span className="game-suit-icon">{suit.icon}</span>
                    : <span className="material-symbols-outlined game-suit-icon" style={{ fontSize: '2rem' }}>{suit.matIcon}</span>
                  }
                  <span className="game-type-label">{suit.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Game State Modifiers ── */}
          <section className="form-section">
            <label className="section-label">Game State</label>
            <div className="chip-grid">
              {[
                { key: 'hand', label: 'Hand', state: hand, setter: setHand },
                { key: 'schneider', label: 'Schneider', state: schneider, setter: setSchneider },
                { key: 'schwarz', label: 'Schwarz', state: schwarz, setter: setSchwarz },
                { key: 'ouvert', label: 'Ouvert', state: ouvert, setter: setOuvert },
              ].map(mod => (
                <button
                  key={mod.key}
                  onClick={() => mod.setter(!mod.state)}
                  className={`chip ${mod.state ? 'active' : ''}`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Spitzen (hidden for Null) ── */}
          {gameType !== 'null' && (
            <section className="form-section">
              <label className="section-label">Spitzen (Matadors)</label>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={`chip ${mitOhne === 'mit' ? 'active' : ''}`} onClick={() => setMitOhne('mit')}>Mit</button>
                  <button className={`chip ${mitOhne === 'ohne' ? 'active' : ''}`} onClick={() => setMitOhne('ohne')}>Ohne</button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {Array.from({ length: maxSpitzen }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setSpitzen(num)}
                      className={`game-type-card ${spitzen === num ? 'active' : ''}`}
                      style={{ width: '48px', height: '48px', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: 700 }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Eye Count (hidden for Null) ── */}
          {gameType !== 'null' ? (
            <section className="form-section">
              <label className="section-label">Eye Count</label>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  className="number-input"
                  min="0"
                  max="120"
                  value={eyeCount}
                  onChange={e => setEyeCount(Math.min(120, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className={`chip ${eyeCount >= 61 && eyeCount < 90 ? 'active' : ''}`} onClick={() => setEyeCount(61)}>61+</button>
                  <button className={`chip ${eyeCount >= 90 && eyeCount < 120 ? 'active' : ''}`} onClick={() => setEyeCount(90)}>Schneider (90+)</button>
                  <button className={`chip ${eyeCount >= 120 ? 'active' : ''}`} onClick={() => setEyeCount(120)}>Schwarz (120)</button>
                  <button className={`chip ${eyeCount < 61 ? 'active' : ''}`} onClick={() => setEyeCount(30)} style={{ color: 'var(--secondary)' }}>Lost (&lt;61)</button>
                </div>
              </div>
            </section>
          ) : (
            <section className="form-section">
              <label className="section-label">Null Result</label>
              <div className="chip-grid">
                <button className={`chip ${eyeCount === 0 ? 'active' : ''}`} onClick={() => setEyeCount(0)}>
                  Won (0 tricks)
                </button>
                <button className={`chip ${eyeCount !== 0 ? 'active' : ''}`} onClick={() => setEyeCount(1)} style={{ color: 'var(--secondary)' }}>
                  Lost (took trick)
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ── Dashboard Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {result && (
            <div className="result-dashboard" style={result.won
              ? {}
              : { background: 'linear-gradient(135deg, var(--secondary), var(--secondary-container))' }
            }>
              <div className="result-content">
                <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.8 }}>
                  Round Result — {outcomeLabel}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                  <span className="result-value" style={{ color: result.won ? 'var(--on-surface)' : 'var(--on-secondary)' }}>
                    {result.gameValue > 0 ? '+' : ''}{result.gameValue}
                  </span>
                  <span style={{ fontWeight: 600, opacity: 0.9 }}>Points</span>
                </div>
                <div className="result-breakdown">
                  <div className="breakdown-row">
                    <span style={{ opacity: 0.8 }}>Base ({SUIT_LABELS[gameType]})</span>
                    <span style={{ fontWeight: 800 }}>{result.baseValue}</span>
                  </div>
                  <div className="breakdown-row">
                    <span style={{ opacity: 0.8 }}>Multiplier</span>
                    <span style={{ fontWeight: 800 }}>×{result.multiplier}</span>
                  </div>
                  {!result.won && (
                    <div className="breakdown-row">
                      <span style={{ opacity: 0.8 }}>Lost penalty</span>
                      <span style={{ fontWeight: 800 }}>×2</span>
                    </div>
                  )}
                  <div className="breakdown-row breakdown-total" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(27,28,28,0.15)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                    <span>Total</span>
                    <span>{result.gameValue > 0 ? '+' : ''}{result.gameValue}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Standing */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--surface-high)', padding: '1rem', borderRadius: '1rem', color: 'var(--primary)' }}>
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>
                Current Standing
              </p>
              {rankings.length > 0 && (
                <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {rankings[0].name} leads ({rankings[0].score >= 0 ? '+' : ''}{rankings[0].score})
                </p>
              )}
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.125rem', letterSpacing: '0.1em' }} onClick={handleCommit}>
            COMMIT RESULT
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)' }}>
            Please verify all values before saving
          </p>
        </div>
      </div>

      {/* ── Recent History ── */}
      {recentRounds.length > 0 && (
        <section style={{ marginTop: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="headline" style={{ fontSize: '2rem' }}>Recent History</h3>
            <button onClick={() => navigate('/history')} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem' }}>
              View All Ledger →
            </button>
          </div>
          <div className="ledger-list">
            {recentRounds.map(r => (
              <div key={r.id} className="ledger-item">
                <div className="ledger-meta">
                  <span className="ledger-id">#{r.id}</span>
                  <div className="ledger-col">
                    <span className="ledger-col-label">Player</span>
                    <span className="ledger-col-value">{r.player}</span>
                  </div>
                  <div className="ledger-col">
                    <span className="ledger-col-label">Game</span>
                    <span className="ledger-col-value" style={{ color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>
                      {r.typeLabel}
                    </span>
                  </div>
                </div>
                <span className={`ledger-score ${r.gameValue >= 0 ? 'score-positive' : 'score-negative'}`}>
                  {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default GameScoringEntry;
