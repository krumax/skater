import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { computeShares } from '../components/ScoreDistributionChart';

// Spieltyp-Farben (konsistent mit StatistikenCharts)
const GAME_TYPE_COLORS = {
  club:    '#1b1c1c',
  spade:   '#414944',
  heart:   '#b52619',
  diamond: '#d0a600',
  grand:   '#0b3d2e',
  null:    '#717974',
};

// ── GameTypePieChart ──────────────────────────────────────────────────────────
const CX = 100, CY = 100, R = 80;

function arcPath(startAngle, endAngle) {
  const x1 = CX + R * Math.sin(startAngle);
  const y1 = CY - R * Math.cos(startAngle);
  const x2 = CX + R * Math.sin(endAngle);
  const y2 = CY - R * Math.cos(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function GameTypePieChart({ typeDistribution }) {
  // Build scores map: type → count, and color map: type → color
  const scores = Object.fromEntries(typeDistribution.map(({ type, count }) => [type, count]));
  const colorMap = Object.fromEntries(typeDistribution.map(({ type }) => [type, GAME_TYPE_COLORS[type] ?? '#999']));
  const slices = computeShares(scores, colorMap);
  const isSingle = slices.length === 1;

  let cumAngle = 0;
  const paths = slices.map((s) => {
    const startAngle = cumAngle;
    const sweepAngle = (s.share / 100) * 2 * Math.PI;
    cumAngle += sweepAngle;
    return { ...s, startAngle, endAngle: cumAngle };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg viewBox="0 0 200 200" width="200" height="200" aria-label="Spielart-Verteilung">
        {isSingle ? (
          <circle cx={CX} cy={CY} r={R} fill={slices[0].color} />
        ) : (
          paths.map((s) => (
            <path key={s.name} d={arcPath(s.startAngle, s.endAngle)} fill={s.color} />
          ))
        )}
        {paths.map((s) => {
          if (s.share < 5) return null;
          const midAngle = s.startAngle + (s.endAngle - s.startAngle) / 2;
          const labelR = R * 0.65;
          const lx = CX + labelR * Math.sin(midAngle);
          const ly = CY - labelR * Math.cos(midAngle);
          const label = SUIT_SYMBOLS[s.name] || (SUIT_LABELS[s.name] ?? s.name);
          return (
            <text key={`lbl-${s.name}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fill="#fff" fontWeight="bold">
              <tspan x={lx} dy="-5">{label}</tspan>
              <tspan x={lx} dy="13">{s.share}%</tspan>
            </text>
          );
        })}
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {slices.map((s) => (
          <li key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>
              {SUIT_SYMBOLS[s.name] && <span style={{ marginRight: '0.25rem' }}>{SUIT_SYMBOLS[s.name]}</span>}
              {SUIT_LABELS[s.name] ?? s.name}
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{s.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PlayerAnalytics = () => {
  const { players, rounds, getPlayerStats } = useGame();
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
  const playShare = rounds.length > 0
    ? ((stats.totalGames / rounds.length) * 100).toFixed(1)
    : '0.0';

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

          {/* ── Brot / Baguette ── */}
          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Brot &amp; Baguette</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={statLabel}>🍞 Brote</p>
                <p style={{ ...statValue, color: stats.brote > 0 ? 'var(--secondary)' : 'var(--on-surface)' }}>{stats.brote}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: '0.25rem' }}>3 Runden ohne Spiel</p>
              </div>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={statLabel}>🥖 Baguettes</p>
                <p style={{ ...statValue, color: stats.baguettes > 0 ? 'var(--secondary)' : 'var(--on-surface)' }}>{stats.baguettes}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: '0.25rem' }}>6 Runden ohne Spiel</p>
              </div>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={statLabel}>🏆 Längste Siegesserie</p>
                <p style={{ ...statValue, color: stats.longestWinStreak >= 3 ? 'var(--primary)' : 'var(--on-surface)' }}>{stats.longestWinStreak}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: '0.25rem' }}>Siege als Alleinspieler in Folge</p>
              </div>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={statLabel}>💀 Längste Verlustserie</p>
                <p style={{ ...statValue, color: stats.longestLossStreak >= 3 ? 'var(--secondary)' : 'var(--on-surface)' }}>{stats.longestLossStreak}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: '0.25rem' }}>Niederlagen als Alleinspieler in Folge</p>
              </div>
            </div>
            <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', backgroundColor: 'var(--surface-low)' }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🍞</span>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>Was ist ein Brot?</h4>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Ein Brot entsteht, wenn ein Spieler eine vollständige Geberrunde (Geben → Hören → Sagen) durchläuft, ohne ein einziges Mal Alleinspieler gewesen zu sein. Eine Baguette sind zwei Brote hintereinander (6 Runden ohne Spiel).
                </p>
              </div>
            </div>
          </section>

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
                <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>percent</span>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Spielanteil</h4>
                    <p style={{ color: 'var(--on-surface-variant)' }}>{playShare}% aller Runden am Tisch gespielt ({stats.totalGames} von {rounds.length}).</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>emoji_events</span>
                    <div>
                      <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Größter Sieg</h4>
                      {stats.bestWin !== null
                        ? <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>+{stats.bestWin}</p>
                        : <p style={{ color: 'var(--outline)' }}>Noch kein Sieg</p>}
                    </div>
                  </div>
                  <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>heart_broken</span>
                    <div>
                      <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Höchste Niederlage</h4>
                      {stats.worstLoss !== null
                        ? <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{stats.worstLoss}</p>
                        : <p style={{ color: 'var(--outline)' }}>Noch keine Niederlage</p>}
                    </div>
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
              {stats.typeDistribution.length === 0 ? (
                <p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>
              ) : (
                <GameTypePieChart typeDistribution={stats.typeDistribution} />
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
