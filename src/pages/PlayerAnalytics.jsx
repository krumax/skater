import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';

const PlayerAnalytics = () => {
  const { players, getPlayerStats } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState(players[0] || '');

  if (players.length === 0) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Spielerstatistik</h1>
          <p className="page-subtitle">Keine Spieler vorhanden.</p>
        </header>
      </div>
    );
  }

  const stats = getPlayerStats(selectedPlayer);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Spielerstatistik</h1>
        <p className="page-subtitle">Detaillierte Auswertung pro Spieler.</p>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem' }}>
        {players.map(name => (
          <button key={name} onClick={() => setSelectedPlayer(name)}
            className={`chip ${selectedPlayer === name ? 'active' : ''}`}
            style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>{name}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
            <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
              <p style={statLabel}>Spiele</p><p style={statValue}>{stats.totalGames}</p>
            </div>
            <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
              <p style={statLabel}>Siegquote</p>
              <p style={{ ...statValue, color: parseFloat(stats.winRate) >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>{stats.winRate}%</p>
            </div>
            <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
              <p style={statLabel}>Standard</p>
              <p style={{ ...statValue, color: stats.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>{stats.totalPoints >= 0 ? '+' : ''}{stats.totalPoints}</p>
            </div>
            <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
              <p style={statLabel}>Seeger-Fabian</p>
              <p style={{ ...statValue, color: stats.seegerTotal >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>{stats.seegerTotal >= 0 ? '+' : ''}{stats.seegerTotal}</p>
            </div>
          </div>

          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Analyse</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.totalGames === 0 ? (
                <div className="card" style={{ color: 'var(--outline)', textAlign: 'center', padding: '2rem' }}>Noch keine Spiele gespielt.</div>
              ) : (<>
                <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: stats.wins > stats.losses ? 'var(--primary)' : 'var(--secondary)' }}>{stats.wins > stats.losses ? 'check_circle' : 'warning'}</span>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Sieg/Niederlage-Bilanz</h4>
                    <p style={{ color: 'var(--on-surface-variant)' }}>{stats.wins} Siege und {stats.losses} Niederlagen ({stats.winRate}% Siegquote).</p>
                  </div>
                </div>
                <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>analytics</span>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Ø Punkte pro Spiel</h4>
                    <p style={{ color: 'var(--on-surface-variant)' }}>Durchschnittlich {stats.avgPoints} Punkte pro Spiel.</p>
                  </div>
                </div>
                {stats.typeDistribution.length > 0 && (
                  <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>style</span>
                    <div>
                      <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Bevorzugte Spielart</h4>
                      <p style={{ color: 'var(--on-surface-variant)' }}>Bevorzugt {SUIT_LABELS[stats.typeDistribution[0]?.type] || stats.typeDistribution[0]?.type} ({stats.typeDistribution[0]?.pct}% aller Spiele).</p>
                    </div>
                  </div>
                )}
              </>)}
            </div>
          </section>

          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spielprotokoll</h3>
            {stats.rounds.length === 0 ? (
              <div className="card" style={{ color: 'var(--outline)', textAlign: 'center', padding: '2rem' }}>Noch keine Runden für diesen Spieler.</div>
            ) : (
              <div className="ledger-list">
                {stats.rounds.slice().reverse().map(r => (
                  <div key={r.id} className="ledger-item">
                    <div className="ledger-meta">
                      <span className="ledger-id">#{r.id}</span>
                      <div className="ledger-col">
                        <span className="ledger-col-label">Spiel</span>
                        <span className="ledger-col-value" style={{ color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>{r.typeLabel}</span>
                      </div>
                    </div>
                    <span className={`ledger-score ${r.gameValue >= 0 ? 'score-positive' : 'score-negative'}`}>{r.gameValue >= 0 ? '+' : ''}{r.gameValue}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spielart-Verteilung</h3>
            <div className="card">
              {stats.typeDistribution.length === 0 ? (<p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {stats.typeDistribution.map(({ type, count, pct }) => (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {SUIT_SYMBOLS[type] && <span style={{ fontSize: '1.25rem' }}>{SUIT_SYMBOLS[type]}</span>}
                          {SUIT_LABELS[type] || type}
                        </span>
                        <span style={{ fontWeight: 800 }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-high)', borderRadius: '4px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Wertungsvergleich</h3>
            <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Standard</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: stats.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>{stats.totalPoints >= 0 ? '+' : ''}{stats.totalPoints}</p>
                </div>
                <span style={{ fontSize: '1.5rem', color: 'var(--outline-variant)' }}>vs</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Seeger-Fabian</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: stats.seegerTotal >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>{stats.seegerTotal >= 0 ? '+' : ''}{stats.seegerTotal}</p>
                </div>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', opacity: 0.3, margin: '1rem 0' }}></div>
              <p style={{ fontSize: '0.75rem', color: 'var(--outline)', lineHeight: 1.6 }}>Das Seeger-Fabian-System addiert +50 bei Gewinn und −50 bei Verlust auf den Alleinspieler, sowie +40 je Gegenspieler bei Verlust.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const statLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.25rem' };
const statValue = { fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" };

export default PlayerAnalytics;
