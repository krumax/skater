import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { SUIT_COLORS, SUIT_TEXT_COLORS } from '../lib/tokens';
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

// ── Streak-Kachel mit Spieltyp-Icons ─────────────────────────────────────────
function StreakCard({ label, streakRounds, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
      <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
        {label}
      </p>
      <p style={{ ...statValue, color }}>{streakRounds.length}x</p>
      {streakRounds.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          {streakRounds.map((r, i) => {
            const bg   = SUIT_COLORS[r.gameType]  ?? '#999';
            const fg   = SUIT_TEXT_COLORS[r.gameType] ?? '#fff';
            const sym  = SUIT_SYMBOLS[r.gameType] ?? '?';
            return (
              <span key={i} title={SUIT_LABELS[r.gameType] ?? r.gameType} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '1.5rem', height: '1.5rem', borderRadius: '0.3rem',
                backgroundColor: bg, color: fg,
                fontSize: '0.8rem', fontWeight: 700, lineHeight: 1,
              }}>
                {sym}
              </span>
            );
          })}
        </div>
      )}
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
      <AchievementCompletionCard
        rounds={rounds}
        player={selectedPlayer}
        allPlayers={players}
        getPlayerStats={getPlayerStats}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '3rem' }}>

        {/* ── Kacheln + PieChart ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Zeile 1: Punkte */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <StatCard label="Standard"      value={`${stats.totalPoints >= 0 ? '+' : ''}${stats.totalPoints}`} color={stats.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)'} />
              <StatCard label="Seeger-Fabian" value={`${stats.seegerTotal >= 0 ? '+' : ''}${stats.seegerTotal}`} color={stats.seegerTotal >= 0 ? 'var(--primary)' : 'var(--secondary)'} />
              <StatCard label="Kombiniert"    value={`${(stats.totalPoints + stats.seegerTotal) >= 0 ? '+' : ''}${stats.totalPoints + stats.seegerTotal}`} color={(stats.totalPoints + stats.seegerTotal) >= 0 ? 'var(--primary)' : 'var(--secondary)'} />
            </div>
            {/* Zeile 2: Quoten */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <StatCard label="Siegquote"        value={`${stats.winRate}%`}  color={parseFloat(stats.winRate) >= 50 ? 'var(--primary)' : 'var(--secondary)'} />
              <StatCard label="Spielanteil"      value={`${playShare}%`}      color="var(--on-surface)" tooltip={`${stats.totalGames} von ${rounds.length} Runden`} />
              <StatCard label="Ø Punkte / Spiel" value={stats.avgPoints}      color="var(--on-surface)" />
            </div>
            {/* Zeile 3: Brote */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <StatCard label="🍞 Brote"     value={stats.brote}     color={stats.brote     > 0 ? 'var(--secondary)' : 'var(--on-surface)'} tooltip="Ein Brot ist eine vollständige Geberrunde ohne Spiel." />
              <StatCard label="🥖 Baguettes" value={stats.baguettes} color={stats.baguettes > 0 ? 'var(--secondary)' : 'var(--on-surface)'} tooltip="Ein Baguette sind zwei vollständige Geberrunden ohne Spiel (6 Runden)." />
            </div>
            {/* Zeile 4: Serien — volle Breite, 2 Spalten */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <StreakCard label="🏆 Längste Siegesserie"  streakRounds={stats.longestWinRounds}  color={stats.longestWinStreak  >= 3 ? 'var(--primary)'   : 'var(--on-surface)'} />
              <StreakCard label="💀 Längste Verlustserie" streakRounds={stats.longestLossRounds} color={stats.longestLossStreak >= 3 ? 'var(--secondary)' : 'var(--on-surface)'} />
            </div>
            {/* Zeile 5: Höchster Sieg / Höchste Niederlage */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <StatCard label="🏅 Höchster Sieg"       value={stats.bestWin  !== null ? `+${stats.bestWin}`  : '–'} color={stats.bestWin  !== null ? 'var(--primary)'   : 'var(--outline)'} />
              <StatCard label="💔 Höchste Niederlage"  value={stats.worstLoss !== null ? `${stats.worstLoss}` : '–'} color={stats.worstLoss !== null ? 'var(--secondary)' : 'var(--outline)'} />
            </div>
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
        {/* ── Achievement-Matrizen ── */}
        <section>
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>⚔️ Angriff</span>
            <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Alleinspiel</h3>
            <p style={{ color: 'var(--on-surface-variant)' }}>Vervollständige die Matrix und beweise deine Meisterschaft. Jede Kombination, jede Spielart, jede Stufe — werde zum Skatmeister.</p>
          </div>
          <AchievementMatrix rounds={rounds} player={selectedPlayer} />

          <div style={{ marginTop: '3rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>🛡️Abwehr</span>
              <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Gegenspiel</h3>
              <p style={{ color: 'var(--on-surface-variant)' }}>Wie oft hat {selectedPlayer} als Gegenspieler einen Alleinspieler gestoppt — aufgeschlüsselt nach Spieltyp und Gewinnstufe.</p>
            </div>
            <DefenseMatrix rounds={rounds} player={selectedPlayer} />
          </div>
        </section>

      </div>
    </div>
  );
};

export default PlayerAnalytics;
