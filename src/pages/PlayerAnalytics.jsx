import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSearchParams } from 'react-router-dom';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { SUIT_COLORS, SUIT_TEXT_COLORS } from '../lib/tokens';
import GameTypePieChart from '../components/analytics/GameTypePieChart';
import AchievementCompletionCard from '../components/analytics/AchievementCompletionCard';
import AchievementMatrix from '../components/analytics/AchievementMatrix';
import DefenseMatrix from '../components/analytics/DefenseMatrix';
import PlayerRankingCard from '../components/analytics/PlayerRankingCard';

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
  const totalPoints = streakRounds.reduce((s, r) => s + r.gameValue, 0);
  const lastRound   = streakRounds.length > 0 ? streakRounds[streakRounds.length - 1] : null;
  const endDate     = lastRound?.timestamp
    ? new Date(lastRound.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
  const tooltip = streakRounds.length > 0
    ? `Punkte gesamt: ${totalPoints >= 0 ? '+' : ''}${totalPoints}${endDate ? `\nSerienende: ${endDate}` : ''}`
    : undefined;

  return (
    <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
      <p style={{ ...statLabel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
        {label}
        {tooltip && (
          <span
            className="material-symbols-outlined"
            title={tooltip}
            style={{ fontSize: '0.8rem', cursor: 'help', opacity: 0.6 }}
          >
            info
          </span>
        )}
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

// ── Highlight-Kachel (Sieg / Niederlage) ─────────────────────────────────────
function HighlightCard({ icon, gradient, textColor, title, round }) {
  const fmtDate = (ts) => ts
    ? new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem 1.5rem',
      background: gradient,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: textColor, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: textColor, opacity: 0.65, marginBottom: '0.1rem' }}>{title}</p>
        {round ? (
          <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: textColor, lineHeight: 1 }}>
            {round.gameValue > 0 ? '+' : ''}{round.gameValue}
            <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '0.6rem', opacity: 0.8 }}>
              {SUIT_SYMBOLS[round.gameType]} {SUIT_LABELS[round.gameType]}
            </span>
          </p>
        ) : (
          <p style={{ fontSize: '1rem', color: textColor, opacity: 0.5 }}>–</p>
        )}
      </div>
      {round && (
        <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: textColor, opacity: 0.65 }}>Runde</p>
            <p style={{ fontWeight: 800, color: textColor }}>#{round.id}</p>
          </div>
          {fmtDate(round.timestamp) && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: textColor, opacity: 0.65 }}>Datum</p>
              <p style={{ fontWeight: 800, color: textColor }}>{fmtDate(round.timestamp)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const PlayerAnalytics = () => {
  const { players: allPlayers, rounds, getPlayerStats } = useGame();
  const players = allPlayers.filter(p => p !== '-');
  const [searchParams] = useSearchParams();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [matrixTab, setMatrixTab] = useState('angriff');

  useEffect(() => {
    const fromUrl = searchParams.get('player');
    if (fromUrl && players.includes(fromUrl)) {
      setSelectedPlayer(fromUrl);
    } else if (players.length > 0 && (!selectedPlayer || !players.includes(selectedPlayer))) {
      setSelectedPlayer(players[0]);
    }
  }, [players, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* ── Höchster Sieg / Höchste Niederlage ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <HighlightCard
          icon="emoji_events"
          gradient="linear-gradient(135deg, #d0a600, #a07800)"
          textColor="#1b1c1c"
          title="↑ Spiel"
          round={stats.bestWinRound}
        />
        <HighlightCard
          icon="heart_broken"
          gradient="linear-gradient(135deg, var(--secondary), var(--secondary-container))"
          textColor="var(--on-secondary)"
          title="↓ Niederlage"
          round={stats.worstLossRound}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '3rem' }}>

        {/* ── Kacheln + PieChart ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Zeile 1: Quoten */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <StatCard label="Siegquote"        value={`${stats.winRate}%`}  color={parseFloat(stats.winRate) >= 50 ? 'var(--primary)' : 'var(--secondary)'} />
              <StatCard label="Spielanteil"      value={`${playShare}%`}      color="var(--on-surface)" tooltip={`${stats.totalGames} von ${rounds.length} Runden`} />
              <StatCard label="Ø Punkte / Spiel" value={stats.avgPoints}      color="var(--on-surface)" />
            </div>
            {/* Zeile 2: Brote */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <StatCard label="🍞 Brote"     value={stats.brote}     color={stats.brote     > 0 ? 'var(--secondary)' : 'var(--on-surface)'} tooltip="Ein Brot ist eine vollständige Geberrunde ohne Spiel." />
              <StatCard label="🥖 Baguettes" value={stats.baguettes} color={stats.baguettes > 0 ? 'var(--secondary)' : 'var(--on-surface)'} tooltip="Ein Baguette sind zwei vollständige Geberrunden ohne Spiel (6 Runden)." />
            </div>
            {/* Zeile 3: Serien */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <StreakCard label="🏆 Längste Siegesserie"  streakRounds={stats.longestWinRounds}  color={stats.longestWinStreak  >= 3 ? 'var(--primary)'   : 'var(--on-surface)'} />
              <StreakCard label="💀 Längste Verlustserie" streakRounds={stats.longestLossRounds} color={stats.longestLossStreak >= 3 ? 'var(--secondary)' : 'var(--on-surface)'} />
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
        <section>
          {/* Tab-Leiste */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            <button
              onClick={() => setMatrixTab('angriff')}
              className={`chip ${matrixTab === 'angriff' ? 'active' : ''}`}
              style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
            >
              ⚔️ Angriff
            </button>
            <button
              onClick={() => setMatrixTab('abwehr')}
              className={`chip ${matrixTab === 'abwehr' ? 'active' : ''}`}
              style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
            >
              🛡️ Abwehr
            </button>
          </div>

          {matrixTab === 'angriff' ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>⚔️ Angriff</span>
                <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Alleinspiel</h3>
                <p style={{ color: 'var(--on-surface-variant)' }}>Vervollständige die Matrix und beweise deine Meisterschaft. Jede Kombination, jede Spielart, jede Stufe — werde zum Skatmeister.</p>
              </div>
              <AchievementMatrix rounds={rounds} player={selectedPlayer} />
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>🛡️ Abwehr</span>
                <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Gegenspiel</h3>
                <p style={{ color: 'var(--on-surface-variant)' }}>Wie oft hat {selectedPlayer} als Gegenspieler einen Alleinspieler gestoppt — aufgeschlüsselt nach Spieltyp und Gewinnstufe.</p>
              </div>
              <DefenseMatrix rounds={rounds} player={selectedPlayer} />
            </>
          )}
        </section>

        {/* ── Ranking-Karten: Farbspiel / Null / Grand ── */}
        <section>
          <PlayerRankingCard rounds={rounds} player={selectedPlayer} />
        </section>

      </div>
    </div>
  );
};

export default PlayerAnalytics;
