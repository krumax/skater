import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS } from '../lib/skatScoring';

const SkatScoreList = () => {
  const navigate = useNavigate();
  const { rounds, players, getPlayerTotals, getSeegerTotals, getPlayerRank } = useGame();

  const standardTotals = getPlayerTotals();
  const seegerTotals = getSeegerTotals();
  const standardRank = getPlayerRank(false);
  const seegerRank = getPlayerRank(true);

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Skatliste</h1>
          <p className="page-subtitle">{rounds.length} Runden gespielt</p>
        </div>
      </header>

      {/* ── Doppelte Wertungsübersicht ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Standard */}
        <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>calculate</span>
            Standardwertung
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {standardRank.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: idx === 0 ? 'var(--tertiary-container)' : 'var(--surface-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800,
                  }}>{entry.rank}</span>
                  <span style={{ fontWeight: 600 }}>{entry.name}</span>
                </div>
                <span style={{
                  fontWeight: 800, fontSize: '1.5rem',
                  fontFamily: "'Manrope', sans-serif",
                  color: entry.score >= 0 ? 'var(--primary)' : 'var(--secondary)',
                }}>
                  {entry.score >= 0 ? '+' : ''}{entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Seeger-Fabian */}
        <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>trophy</span>
            Seeger-Fabian
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {seegerRank.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: idx === 0 ? 'var(--tertiary-container)' : 'var(--surface-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800,
                  }}>{entry.rank}</span>
                  <span style={{ fontWeight: 600 }}>{entry.name}</span>
                </div>
                <span style={{
                  fontWeight: 800, fontSize: '1.5rem',
                  fontFamily: "'Manrope', sans-serif",
                  color: entry.score >= 0 ? 'var(--primary)' : 'var(--secondary)',
                }}>
                  {entry.score >= 0 ? '+' : ''}{entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Spielverlauf ── */}
      <h3 className="headline" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Spielverlauf</h3>

      {rounds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>playing_cards</span>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Runden gespielt.</p>
          <p>Starte ein neues Spiel über die Seitenleiste.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--outline-variant)' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Spieler</th>
                <th style={thStyle}>Typ</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Spielwert</th>
                <th style={thDivider}></th>
                {players.map(p => (
                  <th key={`std-${p}`} style={{ ...thStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--outline)' }}>STD</span>
                    {p}
                  </th>
                ))}
                <th style={thDivider}></th>
                {players.map(p => (
                  <th key={`sf-${p}`} style={{ ...thStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--tertiary)' }}>S-F</span>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {rounds.map((r, idx) => {
                // Standard laufende Summen
                const stdRunning = {};
                players.forEach(p => { stdRunning[p] = 0; });
                rounds.slice(0, idx + 1).forEach(round => {
                  stdRunning[round.player] = (stdRunning[round.player] || 0) + round.gameValue;
                });

                // Seeger laufende Summen
                const sfRunning = {};
                players.forEach(p => { sfRunning[p] = 0; });
                rounds.slice(0, idx + 1).forEach(round => {
                  if (round.seegerScores) {
                    players.forEach(p => {
                      sfRunning[p] = (sfRunning[p] || 0) + (round.seegerScores[p] || 0);
                    });
                  }
                });

                return (
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
                      ...tdStyle, fontWeight: 800, textAlign: 'right',
                      color: r.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)',
                    }}>
                      {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
                    </td>
                    <td style={tdDivider}></td>
                    {players.map(p => (
                      <td key={`std-${p}`} style={{
                        ...tdStyle, textAlign: 'right', fontWeight: 600,
                        opacity: r.player === p ? 1 : 0.4,
                        color: stdRunning[p] >= 0 ? 'var(--on-surface)' : 'var(--secondary)',
                      }}>
                        {stdRunning[p]}
                      </td>
                    ))}
                    <td style={tdDivider}></td>
                    {players.map(p => (
                      <td key={`sf-${p}`} style={{
                        ...tdStyle, textAlign: 'right', fontWeight: 600,
                        opacity: (r.seegerScores?.[p] || 0) !== 0 ? 1 : 0.4,
                        color: sfRunning[p] >= 0 ? 'var(--on-surface)' : 'var(--secondary)',
                      }}>
                        {sfRunning[p]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sitzungsstatistik ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '3rem' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Runden gesamt</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Gewonnen</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.filter(r => r.won).length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Verloren</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{rounds.filter(r => !r.won).length}</p>
        </div>
      </div>
    </div>
  );
};

const thStyle = {
  padding: '0.75rem 1rem',
  textTransform: 'uppercase',
  fontSize: '0.7rem',
  color: 'var(--outline)',
  letterSpacing: '0.08em',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};
const thDivider = {
  width: '1px',
  padding: 0,
  backgroundColor: 'var(--outline-variant)',
};
const tdStyle = { padding: '0.75rem 1rem', whiteSpace: 'nowrap' };
const tdDivider = { width: '1px', padding: 0, backgroundColor: 'var(--surface-high)' };

export default SkatScoreList;
