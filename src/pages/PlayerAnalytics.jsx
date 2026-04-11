import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { computeShares } from '../components/ScoreDistributionChart';

// Spieltyp-Farben (konsistent mit StatistikenCharts)
const GAME_TYPE_COLORS = {
  club: '#1b1c1c',
  spade: '#414944',
  heart: '#b52619',
  diamond: '#d0a600',
  grand: '#0b3d2e',
  null: '#717974',
};

const statLabel = { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.25rem' };
const statValue = { fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" };

// ── GameTypePieChart ──────────────────────────────────────────────────────────
const CX = 110, CY = 110, R = 100, RI = 52;

function donutArcPath(startAngle, endAngle) {
  const cos1 = Math.cos(startAngle - Math.PI / 2), sin1 = Math.sin(startAngle - Math.PI / 2);
  const cos2 = Math.cos(endAngle   - Math.PI / 2), sin2 = Math.sin(endAngle   - Math.PI / 2);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  // outer arc forward, inner arc backward
  return [
    `M ${CX + R  * cos1} ${CY + R  * sin1}`,
    `A ${R}  ${R}  0 ${largeArc} 1 ${CX + R  * cos2} ${CY + R  * sin2}`,
    `L ${CX + RI * cos2} ${CY + RI * sin2}`,
    `A ${RI} ${RI} 0 ${largeArc} 0 ${CX + RI * cos1} ${CY + RI * sin1}`,
    'Z',
  ].join(' ');
}

function GameTypePieChart({ typeDistribution, rounds, player }) {
  // Build scores map: type → count, and color map: type → color
  const scores = Object.fromEntries(typeDistribution.map(({ type, count }) => [type, count]));
  const colorMap = Object.fromEntries(typeDistribution.map(({ type }) => [type, GAME_TYPE_COLORS[type] ?? '#999']));
  const slices = computeShares(scores, colorMap);
  const isSingle = slices.length === 1;

  // Win rates per type
  const winRates = useMemo(() => {
    const map = {};
    typeDistribution.forEach(({ type }) => {
      const games = rounds.filter(r => r.player === player && r.gameType === type);
      const wins  = games.filter(r => r.won).length;
      map[type] = games.length > 0 ? Math.round((wins / games.length) * 100) : null;
    });
    return map;
  }, [rounds, player, typeDistribution]);

  let cumAngle = 0;
  const paths = slices.map((s) => {
    const startAngle = cumAngle;
    const sweepAngle = (s.share / 100) * 2 * Math.PI;
    cumAngle += sweepAngle;
    return { ...s, startAngle, endAngle: cumAngle };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg viewBox="0 0 220 220" width="300" height="300" aria-label="Spielart-Verteilung">
        {isSingle ? (
          <>
            <circle cx={CX} cy={CY} r={R} fill={slices[0].color} />
            <circle cx={CX} cy={CY} r={RI} fill="white" />
          </>
        ) : (
          paths.map((s) => (
            <path key={s.name} d={donutArcPath(s.startAngle, s.endAngle)} fill={s.color} />
          ))
        )}
        {/* Labels auf dem Donut-Ring */}
        {paths.map((s) => {
          if (s.share < 5) return null;
          const midAngle = s.startAngle + (s.endAngle - s.startAngle) / 2;
          const labelR = (R + RI) / 2;
          const lx = CX + labelR * Math.cos(midAngle - Math.PI / 2);
          const ly = CY + labelR * Math.sin(midAngle - Math.PI / 2);
          const label = s.name === 'grand' ? '★' : s.name === 'null' ? '∅' : (SUIT_SYMBOLS[s.name] ?? (SUIT_LABELS[s.name] ?? s.name));
          return (
            <text key={`lbl-${s.name}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fill="#fff" fontWeight="bold">
              <tspan x={lx} dy="-5">{label}</tspan>
              <tspan x={lx} dy="13">{s.share}%</tspan>
            </text>
          );
        })}
        {/* Mittelkreis mit Spielanzahl */}
        <circle cx={CX} cy={CY} r={RI} fill="white" />
        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle"
          fontSize="22" fontWeight="800" fill="var(--on-surface)" fontFamily="Manrope, sans-serif">
          {typeDistribution.reduce((s, t) => s + t.count, 0)}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fontWeight="700" fill="var(--outline)" letterSpacing="0.1em"
          style={{ textTransform: 'uppercase' }}>
          SPIELE
        </text>
      </svg>

      {/* Legende + Gewinnraten */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', paddingBottom: '0.375rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)' }}>Anteil</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)' }}>Gewinnrate</span>
        </div>
        {slices.map((s) => {
          const rate = winRates[s.name];
          return (
            <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', alignItems: 'center' }}>
              {/* Anteil */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {s.name === 'grand'
                    ? <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', lineHeight: 1 }}>stars</span>
                    : s.name === 'null'
                      ? <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', lineHeight: 1 }}>block</span>
                      : SUIT_SYMBOLS[s.name] && <span>{SUIT_SYMBOLS[s.name]}</span>
                  }
                  {SUIT_LABELS[s.name] ?? s.name}
                </span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '0.75rem' }}>{s.share}%</span>
              </div>
              {/* Gewinnrate */}
              {rate !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ flex: 1, height: '8px', borderRadius: '999px', overflow: 'hidden', display: 'flex', backgroundColor: 'var(--surface-high)' }}>
                    <div style={{ width: `${rate}%`, backgroundColor: '#2e7d32', transition: 'width 0.4s ease' }} />
                    <div style={{ flex: 1, backgroundColor: '#d84315' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: rate >= 50 ? '#2e7d32' : '#d84315', minWidth: '2.5rem', textAlign: 'right' }}>{rate}%</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>—</span>
              )}
            </div>
          );
        })}
        {/* Legende */}
        <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.375rem', borderTop: '1px solid var(--outline-variant)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2e7d32' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2e7d32', display: 'inline-block' }} />Gewonnen
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d84315' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#d84315', display: 'inline-block' }} />Verloren
          </span>
        </div>
      </div>
    </div>
  );
}

// ── WinRateByType ─────────────────────────────────────────────────────────────
const WIN_RATE_GROUPS = [
  { key: 'grand',  label: 'Grand',        icon: 'stars',  matIcon: true,  types: ['grand'] },
  { key: 'suit',   label: 'Farbe',        icon: null,     matIcon: false, types: ['club', 'spade', 'heart', 'diamond'] },
  { key: 'null',   label: 'Null',         icon: 'block',  matIcon: true,  types: ['null'] },
];

function WinRateByType({ rounds, player }) {
  const groups = useMemo(() => {
    return WIN_RATE_GROUPS.map(g => {
      const games = rounds.filter(r => r.player === player && g.types.includes(r.gameType));
      const wins  = games.filter(r => r.won).length;
      const total = games.length;
      const rate  = total > 0 ? Math.round((wins / total) * 100) : null;
      return { ...g, wins, losses: total - wins, total, rate };
    }).filter(g => g.total > 0);
  }, [rounds, player]);

  if (groups.length === 0) return <p style={{ color: 'var(--outline)', fontSize: '0.875rem' }}>Noch keine Daten.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {groups.map(g => (
        <div key={g.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {g.matIcon
                ? <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>{g.icon}</span>
                : null}
              {g.label}
              <span style={{ fontWeight: 500, color: 'var(--outline)' }}>({g.total})</span>
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: g.rate >= 50 ? '#2e7d32' : 'var(--secondary)' }}>
              {g.rate}% Sieg
            </span>
          </div>
          <div style={{ height: '10px', borderRadius: '999px', overflow: 'hidden', backgroundColor: 'var(--surface-high)', display: 'flex' }}>
            <div style={{ width: `${g.rate}%`, backgroundColor: '#2e7d32', transition: 'width 0.4s ease' }} />
            <div style={{ flex: 1, backgroundColor: '#d84315' }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2e7d32' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2e7d32', display: 'inline-block' }} />
          Gewonnen
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d84315' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d84315', display: 'inline-block' }} />
          Verloren
        </span>
      </div>
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
                <p style={statLabel}>Kombiniert</p>
                <p style={{ ...statValue, color: (stats.totalPoints + stats.seegerTotal) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                  {(stats.totalPoints + stats.seegerTotal) >= 0 ? '+' : ''}{stats.totalPoints + stats.seegerTotal}
                </p>
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
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} title="Ein Brot ist eine vollständige Geberrunde ohne Spiel.">
                  🍞 Brote <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', cursor: 'help' }}>info</span>
                </p>
                <p style={{ ...statValue, color: stats.brote > 0 ? 'var(--secondary)' : 'var(--on-surface)' }}>{stats.brote}</p>
              </div>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} title="Ein Baguette sind zwei vollständige Geberrunden ohne Spiel (6 Runden).">
                  🥖 Baguettes <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', cursor: 'help' }}>info</span>
                </p>
                <p style={{ ...statValue, color: stats.baguettes > 0 ? 'var(--secondary)' : 'var(--on-surface)' }}>{stats.baguettes}</p>
              </div>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} title="Siege als Alleinspieler in Folge">
                  🏆 Längste Siegesserie <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', cursor: 'help' }}>info</span>
                </p>
                <p style={{ ...statValue, color: stats.longestWinStreak >= 3 ? 'var(--primary)' : 'var(--on-surface)' }}>{stats.longestWinStreak}</p>
              </div>
              <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} title="Niederlagen als Alleinspieler in Folge">
                  💀 Längste Verlustserie <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', cursor: 'help' }}>info</span>
                </p>
                <p style={{ ...statValue, color: stats.longestLossStreak >= 3 ? 'var(--secondary)' : 'var(--on-surface)' }}>{stats.longestLossStreak}</p>
              </div>
              {(() => {
                const wonRounds = stats.rounds.filter(r => r.won);
                return [
                  { label: 'Hand',      count: wonRounds.filter(r => r.hand).length },
                  { label: 'Schneider', count: wonRounds.filter(r => r.schneider).length },
                  { label: 'Schwarz',   count: wonRounds.filter(r => r.schwarz).length },
                  { label: 'Ouvert',    count: wonRounds.filter(r => r.ouvert).length },
                ].map(t => (
                  <div key={t.label} className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
                    <p style={statLabel}>{t.label}</p>
                    <p style={statValue}>{t.count}x</p>
                  </div>
                ));
              })()}
            </div>
            <div className="card" style={{ width: '380px', border: '1px solid var(--outline-variant)' }}>
              <p style={{ ...statLabel, marginBottom: '0.75rem' }}>Spielart-Verteilung & Gewinnraten</p>
              {stats.typeDistribution.length === 0
                ? <p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>
                : <GameTypePieChart typeDistribution={stats.typeDistribution} rounds={rounds} player={selectedPlayer} />
              }
            </div>
          </div>

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
  { type: 'grand',   name: 'Grand', suit: null, matIcon: 'stars', color: '#0b3d2e', textColor: '#fff', subtitle: 'Grundwert 24' },
  { type: 'club',    name: 'Kreuz', suit: '♣',  matIcon: null,    color: '#1b1c1c', textColor: '#fff', subtitle: 'Grundwert 12' },
  { type: 'spade',   name: 'Pik',   suit: '♠',  matIcon: null,    color: '#414944', textColor: '#fff', subtitle: 'Grundwert 11' },
  { type: 'heart',   name: 'Herz',  suit: '♥',  matIcon: null,    color: '#b52619', textColor: '#fff', subtitle: 'Grundwert 10' },
  { type: 'diamond', name: 'Karo',  suit: '♦',  matIcon: null,    color: '#d0a600', textColor: '#1b1c1c', subtitle: 'Grundwert 9' },
];

// Null-Varianten als eigene Zeilen
const nullRows = [
  { id: 'null',             name: 'Null',            check: (r) => !r.hand && !r.ouvert, specialColIdx: 0 },
  { id: 'null_hand',        name: 'Null Hand',        check: (r) => r.hand  && !r.ouvert, specialColIdx: 1 },
  { id: 'null_ouvert',      name: 'Null Ouvert',      check: (r) => !r.hand && r.ouvert,  specialColIdx: 2 },
  { id: 'null_hand_ouvert', name: 'Null Hand Ouvert', check: (r) => r.hand  && r.ouvert,  specialColIdx: 3 },
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
  { id: 'hand',              label: 'Hand',      isSpecial: true, check: (r) => r.hand && !r.schneider && !r.schwarz },
  { id: 'hand_schneider',    label: 'Hand', icon: 'add', label2: 'S',  isSpecial: true, check: (r) => r.hand && r.schneider && !r.schwarz },
  { id: 'hand_schwarz',      label: 'Hand', icon: 'add', label2: 'Sz', isSpecial: true, check: (r) => r.hand && r.schwarz },
  { id: 'schneider',         label: 'Schneider', isSpecial: true, check: (r) => !r.hand && (r.schneider || r.schneiderAnsagt) },
  { id: 'schneiderAnnounced',label: 'Schneider', icon: 'campaign', isSpecial: true, check: (r) => r.schneiderAnnounced },
  { id: 'schwarz',           label: 'Schwarz',   isSpecial: true, check: (r) => !r.hand && (r.schwarz || r.schwarzAnsagt) },
  { id: 'schwarzAnnounced',  label: 'Schwarz',   icon: 'campaign', isSpecial: true, check: (r) => r.schwarzAnnounced },
  { id: 'ouvert',            label: 'Ouvert',    isSpecial: true, check: (r) => r.ouvert },
];

function useMatrixData(rounds, player) {
  return useMemo(() => {
    let unlockedCount = 0;
    let totalPossible = 0;
    const map = {};
    const unlockedKeys = new Set();

    matrixConfig.forEach(row => {
      map[row.type] = {};
      const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === row.type);

      colSpecs.forEach((col) => {
        totalPossible++;
        const unlockedGames = wonGames.filter(col.check);
        if (unlockedGames.length > 0) {
          unlockedCount++;
          const maxScore = Math.max(...unlockedGames.map(g => g.gameValue));
          const firstGame = unlockedGames.reduce((a, b) =>
            new Date(a.timestamp) < new Date(b.timestamp) ? a : b
          );
          const firstDate = firstGame.timestamp
            ? new Date(firstGame.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : null;
          map[row.type][col.id] = { value: maxScore, date: firstDate };
          unlockedKeys.add(`${row.type}::${col.id}`);
        }
      });
    });

    // Null-Varianten separat
    const wonNullGames = rounds.filter(r => r.player === player && r.won && r.gameType === 'null');
    map['null'] = {};
    nullRows.forEach(nr => {
      totalPossible++;
      const unlockedGames = wonNullGames.filter(nr.check);
      if (unlockedGames.length > 0) {
        unlockedCount++;
        const maxScore = Math.max(...unlockedGames.map(g => g.gameValue));
        const firstGame = unlockedGames.reduce((a, b) =>
          new Date(a.timestamp) < new Date(b.timestamp) ? a : b
        );
        const firstDate = firstGame.timestamp
          ? new Date(firstGame.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : null;
        map['null'][nr.id] = { value: maxScore, date: firstDate };
        unlockedKeys.add(`null::${nr.id}`);
      }
    });

    return {
      map,
      unlockedCount,
      totalPossible,
      unlockedKeys,
      percent: totalPossible > 0 ? Math.round((unlockedCount / totalPossible) * 100) : 0
    };
  }, [rounds, player]);
}

const AchievementCompletionCard = ({ rounds, player }) => {
  const { unlockedCount, totalPossible, percent } = useMatrixData(rounds, player);

  // Calculate Level based on unlocked count
  const level = Math.floor(unlockedCount / 3) + 1;

  return (
    <div className="card" style={{
      border: '1px solid var(--outline-variant)',
      width: '340px', flexShrink: 0
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Gesamtfortschritt</span>
        <span style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary)', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700, whiteSpace: 'nowrap' }}>Level {level}</span>
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
                <th style={{ padding: '0.5rem', borderRight: '1px solid rgba(192,200,195,0.5)', minWidth: '90px' }}>
                </th>
                {colSpecs.map(col => (
                  <th key={col.id} style={{ padding: '0.5rem 0.25rem', minWidth: '44px', backgroundColor: col.isSpecial ? 'rgba(116, 91, 0, 0.05)' : 'transparent' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: col.isSpecial ? 'var(--tertiary)' : 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        {col.label}
                        {col.icon && !col.label2 && <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>{col.icon}</span>}
                        {col.label2 && (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.7rem' }}>add</span>
                            {col.label2}
                          </>
                        )}
                      </span>
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
                  <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left', minWidth: '90px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', backgroundColor: row.color, color: row.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {row.matIcon
                          ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: row.textColor }}>{row.matIcon}</span>
                          : <span style={{ fontSize: '1rem', fontWeight: 700, color: row.textColor }}>{row.suit}</span>
                        }
                      </div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.8125rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.name}</div>
                    </div>
                  </td>

                  {colSpecs.map((col, idx) => {
                    // nullOnly columns hidden for non-null rows
                    if (col.nullOnly && row.type !== 'null') {
                      return <td key={col.id} style={{ padding: '0.25rem', backgroundColor: 'rgba(116, 91, 0, 0.05)' }} />;
                    }

                    const val = map[row.type]?.[col.id];
                    const isUnlocked = val !== undefined;

                    return (
                      <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: col.isSpecial ? 'rgba(116, 91, 0, 0.05)' : 'transparent' }}>
                        {isUnlocked ? (
                          <div title={`Bestes Ergebnis: ${val.value}${val.date ? ` · Erstmals: ${val.date}` : ''}`} style={{ width: '2rem', height: '2rem', margin: '0 auto', borderRadius: '0.375rem', backgroundColor: col.isSpecial ? 'var(--tertiary-container)' : 'var(--primary-container)', color: col.isSpecial ? 'var(--primary)' : 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
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
              {/* ── Null-Varianten ── */}
              {nullRows.map((nr) => {
                const val = map['null']?.[nr.id];
                const isUnlocked = val !== undefined;
                return (
                  <tr key={nr.id}
                    style={{ borderTop: '1px solid rgba(192,200,195,0.3)', backgroundColor: 'rgba(113,121,116,0.04)', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(113,121,116,0.04)'}>
                    <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left', minWidth: '90px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', backgroundColor: '#717974', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#fff' }}>block</span>
                        </div>
                        <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--on-surface)', fontSize: '0.8125rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{nr.name}</div>
                      </div>
                    </td>
                    {colSpecs.map((col, idx) => {
                      if (idx === 0) {
                        return (
                          <td key="null-label" colSpan={8} style={{ padding: '0.25rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--on-surface-variant)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic' }}>Ansage entfällt</div>
                          </td>
                        );
                      }
                      if (idx < 8) return null;
                      // Special-Spalten idx 8..13 → specialIdx 0..5
                      // Treppe: nr.specialColIdx bestimmt welche Special-Spalte das Kästchen zeigt
                      const specialIdx = idx - 8;
                      const isMatch = specialIdx === nr.specialColIdx;
                      const bg = col.isSpecial ? 'rgba(116,91,0,0.04)' : 'transparent';
                      if (!isMatch) return <td key={col.id} style={{ padding: '0.25rem', backgroundColor: bg }} />;
                      return (
                        <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: 'rgba(116,91,0,0.05)' }}>
                          {isUnlocked ? (
                            <div title={`Bestes Ergebnis: ${val.value}${val.date ? ` · Erstmals: ${val.date}` : ''}`}
                              style={{ width: '2rem', height: '2rem', margin: '0 auto', borderRadius: '0.375rem', backgroundColor: 'var(--tertiary-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>star</span>
                            </div>
                          ) : (
                            <div style={{ width: '2rem', height: '2rem', margin: '0 auto', borderRadius: '0.375rem', border: '1px dashed rgba(116,91,0,0.3)', opacity: 0.5 }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
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
