import React from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';

const SkatScoreList = () => {
  const { rounds, players, getPlayerTotals, getPlayerRank } = useGame();
  const totals = getPlayerTotals();
  const rankings = getPlayerRank();

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Skatliste</h1>
          <p className="page-subtitle">{rounds.length} rounds played</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '3rem' }}>
        {/* Game History Table */}
        <div>
          <h3 className="headline" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Game History Ledger</h3>

          {rounds.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>playing_cards</span>
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>No rounds played yet.</p>
              <p>Start a new game from the sidebar to begin scoring.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--outline-variant)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>Type</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Score</th>
                  {players.map(p => (
                    <th key={p} style={{ ...thStyle, textAlign: 'right' }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'Work Sans, sans-serif' }}>
                {rounds.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: '1px solid var(--surface-high)',
                      backgroundColor: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface-low)',
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--outline)' }}>{r.id}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.player}</td>
                    <td style={{ ...tdStyle, color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>
                      {r.typeLabel}
                    </td>
                    <td style={{
                      ...tdStyle,
                      fontWeight: 800,
                      textAlign: 'right',
                      color: r.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)',
                    }}>
                      {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
                    </td>
                    {players.map(p => {
                      // Calculate running total up to this round for this player
                      const runningTotal = rounds.slice(0, idx + 1)
                        .filter(round => round.player === p)
                        .reduce((sum, round) => sum + round.gameValue, 0);
                      return (
                        <td key={p} style={{
                          ...tdStyle,
                          textAlign: 'right',
                          fontWeight: 600,
                          opacity: r.player === p ? 1 : 0.5,
                        }}>
                          {runningTotal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Final Score Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h3 className="headline" style={{ fontSize: '1.75rem' }}>Endergebnis</h3>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--surface-low)' }}>
            {rankings.map((entry, idx) => (
              <React.Fragment key={entry.name}>
                {idx > 0 && (
                  <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', opacity: 0.3 }}></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="ledger-col-label">{entry.rank}. Platz</span>
                    <span style={{ fontSize: idx === 0 ? '1.5rem' : '1.25rem', fontWeight: idx === 0 ? 800 : 700 }}>
                      {entry.name}
                    </span>
                  </div>
                  <span
                    className="result-value"
                    style={{
                      margin: 0,
                      fontSize: idx === 0 ? '3rem' : '2rem',
                      color: entry.score >= 0 ? 'var(--primary)' : 'var(--secondary)',
                    }}
                  >
                    {entry.score}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--outline)' }}>
              Session Stats
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Rounds</span>
                <span style={{ fontWeight: 800 }}>{rounds.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Wins</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{rounds.filter(r => r.won).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Losses</span>
                <span style={{ fontWeight: 800, color: 'var(--secondary)' }}>{rounds.filter(r => !r.won).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const thStyle = {
  padding: '1rem',
  textTransform: 'uppercase',
  fontSize: '0.75rem',
  color: 'var(--outline)',
  letterSpacing: '0.1em',
  fontWeight: 700,
};

const tdStyle = {
  padding: '1rem',
};

export default SkatScoreList;
