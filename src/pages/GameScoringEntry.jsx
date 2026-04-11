import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import {
  calculateGameValue,
  getOutcomeLabel,
  SUIT_LABELS,
  SUIT_SYMBOLS,
} from '../lib/skatScoring';

const GameScoringEntry = () => {
  const { players, seating, addRound, currentRound, getPlayerRank, currentRoles } = useGame();

  // Rollen-Label für Spieler
  const getRoleTag = (name) => {
    if (name === currentRoles.geber) return 'Geber';
    if (name === currentRoles.hoeren) return 'Hören';
    if (name === currentRoles.sagen) return 'Sagen';
    return null;
  };

  // ── Formular-Status ──
  const [activePlayer, setActivePlayer] = useState(currentRoles.activePlayers[0] || players[0]);
  const [gameType, setGameType] = useState('spade');
  const [hand, setHand] = useState(false);
  const [schneider, setSchneider] = useState(false);
  const [schneiderAnnounced, setSchneiderAnnounced] = useState(false);
  const [schwarz, setSchwarz] = useState(false);
  const [schwarzAnnounced, setSchwartzAnnounced] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [mitOhne, setMitOhne] = useState('mit');
  const [spitzen, setSpitzen] = useState(1);
  const [eyeCount, setEyeCount] = useState(61);
  const [isBock, setIsBock] = useState(false);

  // ── Automatische Berechnung ──
  const result = useMemo(() => {
    try {
      return calculateGameValue({
        gameType,
        spitzen,
        hand,
        schneider,
        schneiderAnnounced,
        schwarz,
        schwarzAnnounced,
        ouvert,
        eyeCount: gameType === 'null' ? (eyeCount === 0 ? 0 : 1) : eyeCount,
      });
    } catch {
      return null;
    }
  }, [gameType, spitzen, hand, schneider, schwarz, ouvert, eyeCount]);

  const outcomeLabel = useMemo(() => {
    if (gameType === 'passed') return 'Eingepasst';
    if (gameType === 'null') return eyeCount === 0 ? 'Null gewonnen' : 'Null verloren';
    return getOutcomeLabel(eyeCount);
  }, [gameType, eyeCount]);

  // ── Formular zurücksetzen ──
  const resetForm = () => {
    setGameType('spade');
    setHand(false);
    setSchneider(false);
    setSchneiderAnnounced(false);
    setSchwarz(false);
    setSchwartzAnnounced(false);
    setOuvert(false);
    setMitOhne('mit');
    setSpitzen(1);
    setEyeCount(61);
    setIsBock(false);
  };

  // ── Ergebnis speichern ──
  const handleCommit = () => {
    if (!result) return;

    const typeLabel = gameType === 'passed' ? 'Eingepasst' : (SUIT_LABELS[gameType]
      + (hand ? ' Hand' : '')
      + (schneiderAnnounced ? ' Schneider angesagt' : schneider ? ' Schneider' : '')
      + (schwarzAnnounced ? ' Schwarz angesagt' : schwarz ? ' Schwarz' : '')
      + (ouvert ? ' Ouvert' : ''));

    addRound({
      player: gameType === 'passed' ? '-' : activePlayer,
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
      schneiderAnnounced,
      schwarz,
      schwarzAnnounced,
      ouvert,
      isBock,
      mitOhne,
    });

    resetForm();
  };

  // ── Max. Spitzen nach Spielart ──
  const maxSpitzen = ['club', 'spade', 'heart', 'diamond'].includes(gameType) ? 11 : (gameType === 'grand' ? 4 : 0);

  const rankings = getPlayerRank();

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Neues Spielergebnis</h1>
        <p className="page-subtitle">Runde {currentRound} — Ergebnis dieser Runde erfassen.</p>
      </header>

      {/* ── Aktuelle Rollen ── */}
      <div style={{
        display: 'flex', gap: '2rem', marginBottom: '2.5rem', padding: '1rem 1.5rem',
        backgroundColor: 'var(--surface-low)', borderRadius: '0.75rem',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        {[
          { role: 'Geben', icon: 'style', name: currentRoles.geber },
          { role: 'Hören', icon: 'hearing', name: currentRoles.hoeren },
          { role: 'Sagen', icon: 'record_voice_over', name: currentRoles.sagen },
        ].map(r => (
          <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{r.icon}</span>
            <div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', display: 'block' }}>{r.role}</span>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{r.name}</span>
            </div>
          </div>
        ))}
        {seating.length === 4 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>pause_circle</span>
            <div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', display: 'block' }}>Sitzt aus</span>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{currentRoles.geber}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem' }}>
        <div>
          {/* ── Alleinspieler wählen ── */}
          <section className="form-section">
            <label className="section-label">Wer ist der Alleinspieler?</label>
            <div className="player-grid" style={{ opacity: gameType === 'passed' ? 0.4 : 1, pointerEvents: gameType === 'passed' ? 'none' : 'auto' }}>
              {currentRoles.activePlayers.filter(name => name !== '-').map(name => {
                const roleTag = getRoleTag(name);
                return (
                  <button 
                    key={name}
                    onClick={() => setActivePlayer(name)}
                    className={`player-card ${activePlayer === name ? 'active' : ''}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>person</span>
                    <span style={{ fontWeight: 700 }}>{name}</span>
                    {roleTag && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.1em', color: activePlayer === name ? 'rgba(255,255,255,0.7)' : 'var(--outline)',
                        marginTop: '0.25rem',
                      }}>{roleTag}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Spielart ── */}
          <section className="form-section">
            <label className="section-label">Spielart</label>
            <div className="game-type-grid">
              {[
                { key: 'club',    icon: '♣', label: 'Kreuz',  color: '#1b1c1c' },
                { key: 'spade',   icon: '♠', label: 'Pik',    color: '#3d4040' },
                { key: 'heart',   icon: '♥', label: 'Herz',   color: '#8b1a1a' },
                { key: 'diamond', icon: '♦', label: 'Karo',   color: '#b5860d' },
                { key: 'grand',   icon: null, label: 'Grand',  color: '#1b4332', matIcon: 'stars' },
                { key: 'null',    icon: null, label: 'Null',   color: '#6b7280', matIcon: 'block' },
                { key: 'passed',  icon: null, label: 'Passen', color: '#4a4a5a', matIcon: 'skip_next' },
              ].map(suit => {
                const isActive = gameType === suit.key;
                return (
                  <button
                    key={suit.key}
                    onClick={() => {
                      setGameType(suit.key);
                      if (suit.key === 'null') { setSpitzen(1); setMitOhne('mit'); setEyeCount(0); }
                      else { setEyeCount(61); }
                      if (suit.key === 'grand' && spitzen > 4) setSpitzen(4);
                    }}
                    className="game-type-card"
                    style={isActive ? { backgroundColor: suit.color, color: '#fff', boxShadow: `0 8px 24px ${suit.color}66` } : {}}
                  >
                    {suit.icon
                      ? <span className="game-suit-icon">{suit.icon}</span>
                      : <span className="material-symbols-outlined game-suit-icon" style={{ fontSize: '2rem' }}>{suit.matIcon}</span>
                    }
                    <span className="game-type-label">{suit.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Spielstufe ── */}
          <section className="form-section">
            <label className="section-label">Spielstufe</label>
            <div className="chip-grid">
              {[
                { key: 'hand', label: 'Hand', state: hand, setter: setHand, disabled: gameType === 'passed' },
                { key: 'schneider', label: 'Schneider', state: schneider, setter: setSchneider, disabled: gameType === 'passed' || gameType === 'null' },
                { key: 'schneiderAnnounced', label: 'Schneider angesagt', state: schneiderAnnounced, setter: setSchneiderAnnounced, disabled: gameType === 'passed' || gameType === 'null' || !hand },
                { key: 'schwarz', label: 'Schwarz', state: schwarz, setter: setSchwarz, disabled: gameType === 'passed' || gameType === 'null' },
                { key: 'schwarzAnnounced', label: 'Schwarz angesagt', state: schwarzAnnounced, setter: setSchwartzAnnounced, disabled: gameType === 'passed' || gameType === 'null' || !hand },
                { key: 'ouvert', label: 'Ouvert', state: ouvert, setter: setOuvert, disabled: gameType === 'passed' },
              ].map(mod => (
                <button
                  key={mod.key}
                  disabled={mod.disabled}
                  onClick={() => mod.setter(!mod.state)}
                  className={`chip ${mod.state && !mod.disabled ? 'active' : ''}`}
                  style={{ opacity: mod.disabled ? 0.4 : 1, pointerEvents: mod.disabled ? 'none' : 'auto' }}
                >
                  {mod.label}
                </button>
              ))}
              <button
                disabled={gameType === 'passed'}
                onClick={() => setIsBock(!isBock)}
                className={`chip ${isBock && gameType !== 'passed' ? 'active' : ''}`}
                style={{ opacity: gameType === 'passed' ? 0.4 : 1, pointerEvents: gameType === 'passed' ? 'none' : 'auto' }}
              >
                Bockrunde
              </button>
            </div>
          </section>

          {/* ── Ansage ── */}
          <section className="form-section">
            <label className="section-label">Ansage</label>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', opacity: maxSpitzen === 0 ? 0.25 : 1, pointerEvents: maxSpitzen === 0 ? 'none' : 'auto' }}>
                <button className={`chip ${mitOhne === 'mit' ? 'active' : ''}`} onClick={() => setMitOhne('mit')}>Mit</button>
                <button className={`chip ${mitOhne === 'ohne' ? 'active' : ''}`} onClick={() => setMitOhne('ohne')}>Ohne</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {Array.from({ length: 4 }, (_, i) => i + 1).map(num => {
                  const disabled = num > maxSpitzen;
                  return (
                    <button
                      key={num}
                      disabled={disabled}
                      onClick={() => setSpitzen(num)}
                      className={`game-type-card ${spitzen === num && !disabled ? 'active' : ''}`}
                      style={{ width: '48px', height: '48px', borderRadius: '0.5rem', fontSize: '1.125rem', fontWeight: 700, opacity: disabled ? 0.25 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Spitzen ── */}
          <section className="form-section" style={{ opacity: ['club', 'spade', 'heart', 'diamond'].includes(gameType) ? 1 : 0.25, pointerEvents: ['club', 'spade', 'heart', 'diamond'].includes(gameType) ? 'auto' : 'none' }}>
            <label className="section-label">Spitzen</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Array.from({ length: 7 }, (_, i) => i + 5).map(num => (
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
          </section>

          {/* ── Augen ── */}
          <section className="form-section">
            <label className="section-label">Augen</label>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap', opacity: gameType === 'null' || gameType === 'passed' ? 0.4 : 1, pointerEvents: gameType === 'null' || gameType === 'passed' ? 'none' : 'auto' }}>
              <input
                type="number"
                className="number-input"
                disabled={gameType === 'null' || gameType === 'passed'}
                min="0"
                max="120"
                value={eyeCount}
                onChange={e => setEyeCount(Math.min(120, Math.max(0, parseInt(e.target.value) || 0)))}
              />
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button disabled={gameType === 'null' || gameType === 'passed'} className={`chip ${eyeCount >= 61 && eyeCount < 90 ? 'active' : ''}`} onClick={() => setEyeCount(61)}>61+</button>
                <button disabled={gameType === 'null' || gameType === 'passed'} className={`chip ${eyeCount >= 90 && eyeCount < 120 ? 'active' : ''}`} onClick={() => setEyeCount(90)}>Schneider (90+)</button>
                <button disabled={gameType === 'null' || gameType === 'passed'} className={`chip ${eyeCount >= 120 ? 'active' : ''}`} onClick={() => setEyeCount(120)}>Schwarz (120)</button>
                <button disabled={gameType === 'null' || gameType === 'passed'} className={`chip ${eyeCount < 61 ? 'active' : ''}`} onClick={() => setEyeCount(30)} style={{ color: 'var(--secondary)' }}>Verloren (&lt;61)</button>
              </div>
            </div>
          </section>

          {/* ── Null-Ergebnis ── */}
          <section className="form-section">
            <label className="section-label">Null-Ergebnis</label>
            <div className="chip-grid" style={{ opacity: gameType !== 'null' ? 0.4 : 1, pointerEvents: gameType !== 'null' ? 'none' : 'auto' }}>
              <button disabled={gameType !== 'null'} className={`chip ${eyeCount === 0 ? 'active' : ''}`} onClick={() => setEyeCount(0)}>
                Gewonnen (0 Stiche)
              </button>
              <button disabled={gameType !== 'null'} className={`chip ${eyeCount !== 0 ? 'active' : ''}`} onClick={() => setEyeCount(1)} style={{ color: 'var(--secondary)' }}>
                Verloren (Stich gemacht)
              </button>
            </div>
          </section>
        </div>

        {/* ── Ergebnis-Dashboard ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {result && (
            <div className="result-dashboard" style={result.won
              ? {}
              : { background: 'linear-gradient(135deg, var(--secondary), var(--secondary-container))' }
            }>
              <div className="result-content">
                <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.8 }}>
                  Rundenergebnis — {outcomeLabel}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                  <span className="result-value" style={{ color: result.won ? 'var(--on-surface)' : 'var(--on-secondary)' }}>
                    {isBock
                      ? (result.gameValue * 2 > 0 ? '+' : '') + result.gameValue * 2
                      : (result.gameValue > 0 ? '+' : '') + result.gameValue
                    }
                  </span>
                  <span style={{ fontWeight: 600, opacity: 0.9 }}>Punkte</span>
                </div>
                <div className="result-breakdown">
                  <div className="breakdown-row">
                    <span style={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Grundwert
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '1.25rem', height: '1.25rem', borderRadius: '0.25rem', flexShrink: 0,
                        backgroundColor: {
                          club: '#1b1c1c', spade: '#3d4040', heart: '#8b1a1a',
                          diamond: '#b5860d', grand: '#1b4332', null: '#6b7280', passed: '#4a4a5a',
                        }[gameType] ?? 'var(--surface-high)',
                      }}>
                        {gameType === 'grand'
                          ? <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: '#fff' }}>stars</span>
                          : gameType === 'null'
                            ? <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: '#fff' }}>block</span>
                            : gameType === 'passed'
                              ? <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: '#fff' }}>skip_next</span>
                              : <span style={{ fontSize: '0.75rem', fontWeight: 700, color: gameType === 'diamond' ? '#1b1c1c' : '#fff', lineHeight: 1 }}>
                                  {{ club: '♣', spade: '♠', heart: '♥', diamond: '♦' }[gameType]}
                                </span>
                        }
                      </span>
                    </span>
                    <span style={{ fontWeight: 800 }}>{result.baseValue}</span>
                  </div>
                  <div className="breakdown-row">
                    <span style={{ opacity: 0.8 }}>Multiplikator</span>
                    <span style={{ fontWeight: 800 }}>×{result.multiplier}</span>
                  </div>
                  {!result.won && (
                    <div className="breakdown-row">
                      <span style={{ opacity: 0.8 }}>Verlust-Strafe</span>
                      <span style={{ fontWeight: 800 }}>×2</span>
                    </div>
                  )}
                  {isBock && (
                    <div className="breakdown-row">
                      <span style={{ opacity: 0.8 }}>Bockrunde</span>
                      <span style={{ fontWeight: 800 }}>×2</span>
                    </div>
                  )}
                  <div className="breakdown-row breakdown-total" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(27,28,28,0.15)', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                    <span>Gesamt</span>
                    <span>{isBock
                      ? (result.gameValue * 2 > 0 ? '+' : '') + result.gameValue * 2
                      : (result.gameValue > 0 ? '+' : '') + result.gameValue
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aktueller Stand */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--surface-high)', padding: '1rem', borderRadius: '1rem', color: 'var(--primary)' }}>
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <div>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>
                Aktueller Stand
              </p>
              {rankings.length > 0 && (
                <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {rankings[0].name} führt ({rankings[0].score >= 0 ? '+' : ''}{rankings[0].score})
                </p>
              )}
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.125rem', letterSpacing: '0.1em' }} onClick={handleCommit}>
            ERGEBNIS SPEICHERN
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)' }}>
            Bitte alle Werte vor dem Speichern überprüfen
          </p>
        </div>
      </div>
    </div>
  );
};

export default GameScoringEntry;
