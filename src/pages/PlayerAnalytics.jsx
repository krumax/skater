import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS } from '../lib/skatScoring';
import GameTypePieChart from '../components/analytics/GameTypePieChart';
import AchievementCompletionCard from '../components/analytics/AchievementCompletionCard';
import AchievementMatrix from '../components/analytics/AchievementMatrix';
import DefenseMatrix from '../components/analytics/DefenseMatrix';

const statLabel = {
  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.25rem',
};
const statValue = { fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" };

// ── Stat-Kachel ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color, tooltip }) {
  return (
    <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
      <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} title={tooltip}>
        {label}
        {tooltip && <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', cursor: 'help' }}>info</span>}
      </p>
      <p style={{ ...statValue, color }}>{value}</p>
    </div>
  );
}

// ── Analyse-Karte ─────────────────────────────────────────────────────────────
function AnalysisCard({ icon, iconColor, title, children }) {
  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <span className="material-symbols-outlined" style={{ color: iconColor }}>{icon}</span>
      <div>
        <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{title}</h4>
        {children}
      </div>
    </div>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
const PlayerAnalytics = () => {
  const { players: allPlayers, rounds, getPlayerStats } = useGame();
  const players = allPlayers.filter(p => p !== '-');
  const [selectedPlayer, setSelectedPlayer] = useState('');

  useEffect(() => {
    if (players.length > 0 && (!selectedPlayer || !players.includes(selectedPlayer))) {
      setSelectedPlayer(players[0]);
    }
  }, [players]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const wonRounds = stats.rounds.filter(r => r.won);
  const modifierCounts = [
    { label: 'Hand',      count: wonRounds.filter(r => r.hand).length },
    { label: 'Schneider', count: wonRounds.filter(r => r.schneider).length },
    { label: 'Schwarz',   count: wonRounds.filter(r => r.schwarz).length },
    { label: 'Ouvert',    count: wonRounds.filter(r => r.ouvert).length },
  ];

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Spielerstatistik</h1>
        <p className="page-subtitle">Detaillierte Auswertung pro Spieler.</p>
      </header>

      {/* Spieler-Auswahl */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {players.map(name => (
          <button key={name} onClick={() => setSelectedPlayer(name)}
            className={`chip ${selectedPlayer === name ? 'active' : ''}`}
            style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
            {name}
          </button>
        ))}
      </div>

      {/* Level-Karte */}
      <AchievementCompletionCard rounds={rounds} player={selectedPlayer} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '3rem' }}>

        {/* ── Kacheln + PieChart ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <StatCard label="Kombiniert"    value={`${(stats.totalPoints + stats.seegerTotal) >= 0 ? '+' : ''}${stats.totalPoints + stats.seegerTotal}`} color={(stats.totalPoints + stats.seegerTotal) >= 0 ? 'var(--primary)' : 'var(--secondary)'} />
            <StatCard label="Siegquote"     value={`${stats.winRate}%`}       color={parseFloat(stats.winRate) >= 50 ? 'var(--primary)' : 'var(--secondary)'} />
            <StatCard label="Standard"      value={`${stats.totalPoints >= 0 ? '+' : ''}${stats.totalPoints}`} color={stats.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)'} />
            <StatCard label="Seeger-Fabian" value={`${stats.seegerTotal >= 0 ? '+' : ''}${stats.seegerTotal}`} color={stats.seegerTotal >= 0 ? 'var(--primary)' : 'var(--secondary)'} />
            <StatCard label="🍞 Brote"      value={stats.brote}    color={stats.brote > 0 ? 'var(--secondary)' : 'var(--on-surface)'}    tooltip="Ein Brot ist eine vollständige Geberrunde ohne Spiel." />
            <StatCard label="🥖 Baguettes"  value={stats.baguettes} color={stats.baguettes > 0 ? 'var(--secondary)' : 'var(--on-surface)'} tooltip="Ein Baguette sind zwei vollständige Geberrunden ohne Spiel (6 Runden)." />
            <StatCard label="🏆 Längste Siegesserie"  value={stats.longestWinStreak}  color={stats.longestWinStreak >= 3 ? 'var(--primary)' : 'var(--on-surface)'}   tooltip="Siege als Alleinspieler in Folge" />
            <StatCard label="💀 Längste Verlustserie" value={stats.longestLossStreak} color={stats.longestLossStreak >= 3 ? 'var(--secondary)' : 'var(--on-surface)'} tooltip="Niederlagen als Alleinspieler in Folge" />
            {modifierCounts.map(t => (
              <StatCard key={t.label} label={t.label} value={`${t.count}x`} color="var(--on-surface)" />
            ))}
          </div>

          <div className="card" style={{ width: '380px', border: '1px solid var(--outline-variant)' }}>
            <p style={{ ...statLabel, marginBottom: '0.75rem' }}>Spielart-Verteilung &amp; Gewinnraten</p>
            {stats.typeDistribution.length === 0
              ? <p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>
              : <GameTypePieChart typeDistribution={stats.typeDistribution} rounds={rounds} player={selectedPlayer} />
            }
          </div>
        </div>

        {/* ── Achievement-Matrizen ── */}
        <section>
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Angriff</span>
            <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Alleinspiel</h3>
            <p style={{ color: 'var(--on-surface-variant)' }}>Vervollständige die Matrix und beweise deine Meisterschaft. Jede Kombination, jede Spielart, jede Stufe — werde zum Skatmeister.</p>
          </div>
          <AchievementMatrix rounds={rounds} player={selectedPlayer} />

          <div style={{ marginTop: '3rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Abwehr</span>
              <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Gegenspiel</h3>
              <p style={{ color: 'var(--on-surface-variant)' }}>Wie oft hat {selectedPlayer} als Gegenspieler einen Alleinspieler gestoppt — aufgeschlüsselt nach Spieltyp und Gewinnstufe.</p>
            </div>
            <DefenseMatrix rounds={rounds} player={selectedPlayer} />
          </div>
        </section>

        {/* ── Analyse ── */}
        <section>
          <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Analyse</h3>
          {stats.totalGames === 0 ? (
            <div className="card" style={{ color: 'var(--outline)', textAlign: 'center', padding: '2rem' }}>Noch keine Spiele gespielt.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AnalysisCard icon={stats.wins > stats.losses ? 'check_circle' : 'warning'} iconColor={stats.wins > stats.losses ? 'var(--primary)' : 'var(--secondary)'} title="Sieg/Niederlage-Bilanz">
                <p style={{ color: 'var(--on-surface-variant)' }}>{stats.wins} Siege und {stats.losses} Niederlagen ({stats.winRate}% Siegquote).</p>
              </AnalysisCard>
              <AnalysisCard icon="analytics" iconColor="var(--primary)" title="Ø Punkte pro Spiel">
                <p style={{ color: 'var(--on-surface-variant)' }}>Durchschnittlich {stats.avgPoints} Punkte pro Spiel.</p>
              </AnalysisCard>
              <AnalysisCard icon="percent" iconColor="var(--tertiary)" title="Spielanteil">
                <p style={{ color: 'var(--on-surface-variant)' }}>{playShare}% aller Runden am Tisch gespielt ({stats.totalGames} von {rounds.length}).</p>
              </AnalysisCard>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <AnalysisCard icon="emoji_events" iconColor="var(--primary)" title="Größter Sieg">
                  {stats.bestWin !== null
                    ? <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>+{stats.bestWin}</p>
                    : <p style={{ color: 'var(--outline)' }}>Noch kein Sieg</p>}
                </AnalysisCard>
                <AnalysisCard icon="heart_broken" iconColor="var(--secondary)" title="Höchste Niederlage">
                  {stats.worstLoss !== null
                    ? <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{stats.worstLoss}</p>
                    : <p style={{ color: 'var(--outline)' }}>Noch keine Niederlage</p>}
                </AnalysisCard>
              </div>
              {stats.typeDistribution.length > 0 && (
                <AnalysisCard icon="style" iconColor="var(--tertiary)" title="Bevorzugte Spielart">
                  <p style={{ color: 'var(--on-surface-variant)' }}>
                    Bevorzugt {SUIT_LABELS[stats.typeDistribution[0]?.type] || stats.typeDistribution[0]?.type} ({stats.typeDistribution[0]?.pct}% aller Spiele).
                  </p>
                </AnalysisCard>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PlayerAnalytics;
