import React, { useState, useMemo } from 'react';
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

const statLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.25rem' };
const statValue = { fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" };

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
      <svg viewBox="0 0 200 200" width="280" height="280" aria-label="Spielart-Verteilung">
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
          const label = s.name === 'grand' ? '★' : s.name === 'null' ? '∅' : (SUIT_SYMBOLS[s.name] ?? (SUIT_LABELS[s.name] ?? s.name));
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
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {s.name === 'grand'
                ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', lineHeight: 1 }}>stars</span>
                : s.name === 'null'
                ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', lineHeight: 1 }}>block</span>
                : SUIT_SYMBOLS[s.name] && <span>{SUIT_SYMBOLS[s.name]}</span>
              }
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* ── Kacheln + PieChart nebeneinander ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
            <div className="card" style={{ minWidth: '300px' }}>
              <p style={{ ...statLabel, marginBottom: '0.75rem' }}>Spielart-Verteilung</p>
              {stats.typeDistribution.length === 0
                ? <p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>
                : <GameTypePieChart typeDistribution={stats.typeDistribution} />
              }
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

          {/* ── Skat Achievement Matrix ── */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', gap: '2rem' }}>
              <div>
                <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Spieler-Erfolge</span>
                <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Skat Achievement Matrix</h3>
                <p style={{ color: 'var(--on-surface-variant)' }}>Vervollständige die Matrix und beweise deine Meisterschaft. Jede Kombination, jede Spielart, jede Stufe — werde zum Skatmeister.</p>
              </div>
              <AchievementCompletionCard rounds={rounds} player={selectedPlayer} />
            </div>
            
            <AchievementMatrix rounds={rounds} player={selectedPlayer} />
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
        </div>
      </div>
    </div>
  );
};

// Spieltyp-Konfiguration für die Matrix — Icons konsistent mit SkatScoreList & GameScoringEntry
const matrixConfig = [
  { type: 'grand',   name: 'Grand',  suit: null, matIcon: 'stars',  color: '#0b3d2e', textColor: '#fff',        subtitle: 'Grundwert 24' },
  { type: 'club',    name: 'Kreuz',  suit: '♣',  matIcon: null,     color: '#1b1c1c', textColor: '#fff',        subtitle: 'Grundwert 12' },
  { type: 'spade',   name: 'Pik',    suit: '♠',  matIcon: null,     color: '#414944', textColor: '#fff',        subtitle: 'Grundwert 11' },
  { type: 'heart',   name: 'Herz',   suit: '♥',  matIcon: null,     color: '#b52619', textColor: '#fff',        subtitle: 'Grundwert 10' },
  { type: 'diamond', name: 'Karo',   suit: '♦',  matIcon: null,     color: '#d0a600', textColor: '#1b1c1c',     subtitle: 'Grundwert 9' },
  { type: 'null',    name: 'Null',   suit: null, matIcon: 'block',  color: '#717974', textColor: '#fff',        subtitle: 'Nullspiel' },
];

const colSpecs = [
  { id: 'mit_1', label: '+1', check: (r) => r.mitOhne === 'mit' && r.spitzen === 1 },
  { id: 'mit_2', label: '+2', check: (r) => r.mitOhne === 'mit' && r.spitzen === 2 },
  { id: 'mit_3', label: '+3', check: (r) => r.mitOhne === 'mit' && r.spitzen === 3 },
  { id: 'mit_4', label: '+4', check: (r) => r.mitOhne === 'mit' && r.spitzen === 4 },
  { id: 'ohne_1', label: '−1', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 1 },
  { id: 'ohne_2', label: '−2', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 2 },
  { id: 'ohne_3', label: '−3', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 3 },
  { id: 'ohne_4', label: '−4', check: (r) => r.mitOhne === 'ohne' && r.spitzen === 4 },
  { id: 'hand', label: 'Hand', isSpecial: true, check: (r) => r.hand },
  { id: 'schneider', label: 'Schneid', isSpecial: true, check: (r) => r.schneider || r.schneiderAnsagt },
  { id: 'schwarz', label: 'Schwarz', isSpecial: true, check: (r) => r.schwarz || r.schwarzAnsagt },
  { id: 'ouvert', label: 'Ouvert', isSpecial: true, check: (r) => r.ouvert },
];

function useMatrixData(rounds, player) {
  return useMemo(() => {
    let unlockedCount = 0;
    let totalPossible = 0;
    const map = {};

    matrixConfig.forEach(row => {
      map[row.type] = {};
      const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === row.type);

      colSpecs.forEach((col, idx) => {
        if (row.type === 'null') {
          if (idx < 8) return; // Ansage N/A bei Null
          if (col.id === 'schneider' || col.id === 'schwarz') return; // N/A bei Null
        }

        totalPossible++;

        const unlockedGames = wonGames.filter(col.check);
        if (unlockedGames.length > 0) {
          unlockedCount++;
          const maxScore = Math.max(...unlockedGames.map(g => g.gameValue));
          map[row.type][col.id] = maxScore;
        }
      });
    });

    return { 
      map, 
      unlockedCount, 
      totalPossible, 
      percent: totalPossible > 0 ? Math.round((unlockedCount / totalPossible) * 100) : 0 
    };
  }, [rounds, player]);
}

const AchievementCompletionCard = ({ rounds, player }) => {
  const { unlockedCount, totalPossible, percent } = useMatrixData(rounds, player);
  
  // Calculate Level based on unlocked count
  const level = Math.floor(unlockedCount / 3) + 1;

  return (
    <div style={{
      backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem',
      boxShadow: '0 12px 32px var(--shadow-color)', border: '1px solid var(--outline-variant)',
      minWidth: '280px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gesamtfortschritt</span>
        <span style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary)', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>Level {level}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '2.25rem', fontFamily: "'Manrope', sans-serif", fontWeight: 800, color: 'var(--primary)' }}>{unlockedCount}</span>
        <span style={{ color: 'var(--on-surface-variant)', fontSize: '1.5rem', fontFamily: "'Manrope', sans-serif", fontWeight: 600 }}>/ {totalPossible}</span>
      </div>
      <div style={{ width: '100%', backgroundColor: 'var(--surface-low)', height: '0.5rem', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'var(--primary)', height: '100%', width: `${percent}%`, borderRadius: '999px' }}></div>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.75rem', fontStyle: 'italic', textAlign: 'right' }}>{percent}% erreicht</p>
    </div>
  );
};

const AchievementMatrix = ({ rounds, player }) => {
  const { map } = useMatrixData(rounds, player);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', boxShadow: '0 8px 32px var(--shadow-color)', overflow: 'hidden', border: '1px solid rgba(192,200,195,0.3)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-low)' }}>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', borderRight: '1px solid rgba(192,200,195,0.5)', minWidth: '140px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.55rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.2rem' }}>Zeile: Spielart</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Spalte: Ansage & Zustände</span>
                  </div>
                </th>
                {colSpecs.map(col => (
                  <th key={col.id} style={{ padding: '0.5rem 0.25rem', minWidth: '44px', backgroundColor: col.isSpecial ? 'rgba(116, 91, 0, 0.05)' : 'transparent' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: col.isSpecial ? 'var(--tertiary)' : 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixConfig.map((row, i) => (
                <tr key={row.type} style={{ borderTop: '1px solid rgba(192,200,195,0.3)', backgroundColor: row.type === 'grand' ? 'rgba(208, 166, 0, 0.05)' : 'transparent', transition: 'background-color 0.2s', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = row.type === 'grand' ? 'rgba(208, 166, 0, 0.05)' : 'transparent'}>
                  <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', backgroundColor: row.color, color: row.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {row.matIcon
                          ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: row.textColor }}>{row.matIcon}</span>
                          : <span style={{ fontSize: '1rem', fontWeight: 700, color: row.textColor }}>{row.suit}</span>
                        }
                      </div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.8125rem' }}>{row.name}</div>
                    </div>
                  </td>
                  
                  {colSpecs.map((col, idx) => {
                    // Null special behaviors
                    if (row.type === 'null') {
                      if (idx === 0) {
                        return (
                          <td key="null-span" colSpan={8} style={{ padding: '0.25rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--on-surface-variant)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic' }}>Ansage entfällt bei Null</div>
                          </td>
                        );
                      }
                      if (idx < 8) return null; // handled by colspan
                      if (col.id === 'schneider' || col.id === 'schwarz') {
                        return (
                          <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: col.isSpecial ? 'rgba(116, 91, 0, 0.05)' : 'transparent' }}>
                             <div style={{ width: '2rem', height: '2rem', margin: '0 auto', borderRadius: '0.375rem', border: '1px dashed rgba(116, 91, 0, 0.2)' }}></div>
                          </td>
                        );
                      }
                    }

                    const val = map[row.type]?.[col.id];
                    const isUnlocked = val !== undefined;

                    return (
                      <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: col.isSpecial ? 'rgba(116, 91, 0, 0.05)' : 'transparent' }}>
                        {isUnlocked ? (
                          <div title={`Bestes Ergebnis: ${val}`} style={{ width: '2rem', height: '2rem', margin: '0 auto', borderRadius: '0.375rem', backgroundColor: col.isSpecial ? 'var(--tertiary-container)' : 'var(--primary-container)', color: col.isSpecial ? 'var(--primary)' : 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
                               onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                               onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>
                              {col.isSpecial ? 'star' : 'military_tech'}
                            </span>
                          </div>
                        ) : (
                          <div style={{ width: '2rem', height: '2rem', margin: '0 auto', borderRadius: '0.375rem', border: `1px dashed ${col.isSpecial ? 'rgba(116, 91, 0, 0.3)' : 'var(--outline-variant)'}`, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!col.isSpecial && <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', opacity: 0.4 }}>lock</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ backgroundColor: 'var(--surface-low)', padding: '1.5rem', borderRadius: '0.75rem' }}>
          <h4 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--on-surface)', marginBottom: '1rem' }}>Legende</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--primary-container)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>military_tech</span></div>
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Gewonnen (mit Skat)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--tertiary-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>star</span></div>
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Besonderer Zustand gewonnen (Hand / Schneider / Schwarz / Ouvert)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.25rem', border: '1px dashed var(--outline-variant)', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{ fontSize: '1rem', opacity: 0.5 }}>lock</span></div>
              <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Noch nicht gespielt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerAnalytics;
