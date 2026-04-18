import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { SUIT_COLORS, PLAYER_COLORS } from '../lib/tokens';
import { computeAchievementUnlocks } from '../lib/playerStats';
import { computeListStats, computeListProgress } from '../lib/spiellistenUtils';
import GameTypePieChart      from '../components/analytics/GameTypePieChart';
import GameValueHistogram    from '../components/analytics/GameValueHistogram';
import GameTypeHeatmap       from '../components/analytics/GameTypeHeatmap';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

/* ── Zeitraster automatisch bestimmen ── */
function detectTimeGranularity(rounds) {
  const timestamps = rounds.map(r => new Date(r.timestamp).getTime()).filter(Boolean);
  if (timestamps.length < 2) return 'week';
  const spanMs = Math.max(...timestamps) - Math.min(...timestamps);
  const days = spanMs / (1000 * 60 * 60 * 24);
  if (days < 14)  return 'day';
  if (days < 90)  return 'week';
  if (days < 730) return 'month';
  return 'year';
}

function formatTimeBucket(date, granularity) {
  const d = new Date(date);
  if (granularity === 'day')   return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  if (granularity === 'week') {
    // ISO-Wochennummer
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const week = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
    return `KW${week} ${d.getFullYear()}`;
  }
  if (granularity === 'month') return d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
  return String(d.getFullYear());
}

function bucketKey(timestamp, granularity) {
  const d = new Date(timestamp);
  if (granularity === 'day')   return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (granularity === 'week') {
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const week = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  if (granularity === 'month') return `${d.getFullYear()}-${d.getMonth()}`;
  return String(d.getFullYear());
}

/* ── Custom Recharts Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const achievements = payload[0]?.payload?._achievements ?? [];
  return (
    <div style={{
      background: 'var(--surface)', padding: '0.75rem 1rem', borderRadius: '0.5rem',
      boxShadow: '0 8px 24px var(--shadow-color)', fontSize: '0.8125rem',
      maxWidth: '260px',
    }}>
      <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
      {achievements.length > 0 && (
        <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.5rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', marginBottom: '0.3rem' }}>
            Neue Achievements
          </p>
          {achievements.map((a, i) => (
            <p key={i} style={{ fontSize: '0.75rem', color: 'var(--on-surface)', marginBottom: '0.15rem' }}>
              {a.label} <span style={{ color: 'var(--outline)', fontSize: '0.7rem' }}>({a.player})</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────── */

const StatistikenCharts = () => {
  const { rounds, players: allPlayers, spiellisten, closeSpielliste } = useGame();
  const players = allPlayers.filter(p => p !== '-');
  const [xMode, setXMode] = useState('rounds'); // 'rounds' | 'time'
  const [timeGranularity, setTimeGranularity] = useState('week'); // 'day' | 'week' | 'month'
  const [selectedSpiellisteId, setSelectedSpiellisteId] = useState(null);

  /* ── Achievement-Unlocks (muss vor trendByRound stehen) ── */
  const achievementUnlocks = React.useMemo(() =>
    computeAchievementUnlocks(players, rounds),
  [players, rounds]);

  const unlocksByRound = React.useMemo(() => {
    const map = {};
    achievementUnlocks.forEach(({ roundIndex, player, label }) => {
      if (!map[roundIndex]) map[roundIndex] = [];
      map[roundIndex].push({ player, label });
    });
    return map;
  }, [achievementUnlocks]);

  /* ── 1a. Punkteentwicklung nach Runden ── */
  const trendByRound = React.useMemo(() => {
    const running = {};
    players.forEach(p => { running[p] = 0; });
    return rounds.map((r, idx) => {
      running[r.player] = (running[r.player] || 0) + r.gameValue;
      return {
        name: `R${idx + 1}`,
        ...{ ...running },
        _achievements: unlocksByRound[idx] ?? [],
      };
    });
  }, [rounds, players, unlocksByRound]);

  /* ── 1b. Punkteentwicklung nach Zeit ── */
  const trendByTime = React.useMemo(() => {
    if (rounds.length === 0) return [];
    const buckets = {};
    const running = {};
    players.forEach(p => { running[p] = 0; });

    rounds.forEach(r => {
      if (!r.timestamp) return;
      running[r.player] = (running[r.player] || 0) + r.gameValue;
      const key   = bucketKey(r.timestamp, timeGranularity);
      const label = formatTimeBucket(r.timestamp, timeGranularity);
      buckets[key] = { name: label, ...Object.fromEntries(players.map(p => [p, running[p]])) };
    });

    return Object.values(buckets);
  }, [rounds, players, timeGranularity]);

  const trendData = xMode === 'rounds' ? trendByRound : trendByTime;

  // Custom Dot: zeigt einen Stern wenn an diesem Punkt ein Achievement freigeschaltet wurde
  const makeAchievementDot = (playerName, playerColor) => (props) => {
    const { cx, cy, index } = props;
    if (xMode !== 'rounds') return null;
    const events = unlocksByRound[index];
    if (!events) return null;
    const mine = events.filter(e => e.player === playerName);
    if (mine.length === 0) return null;

    const tooltip = mine.map(e => e.label).join('\n');
    return (
      <g key={`ach-${playerName}-${index}`}>
        <circle cx={cx} cy={cy} r={7} fill={playerColor} stroke="var(--surface)" strokeWidth={2} />
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fill="#fff" fontWeight="bold">★</text>
      </g>
    );
  };

  /* ── 2. Spieltypen-Verteilung ── */
  const typeDistribution = React.useMemo(() => {
    const counts = {};
    rounds.forEach(r => {
      const t = r.gameType || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    const total = rounds.length || 1;
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, pct: ((count / total) * 100).toFixed(0) }))
      .sort((a, b) => b.count - a.count);
  }, [rounds]);

  /* ── 3. Gewinnraten nach Typ — entfernt, ersetzt durch neue Statistiken ── */

  /* ── 3. Erfolgsquoten Alleinspieler vs. Gegenspieler ── */
  const successRates = React.useMemo(() => {
    const realRounds = rounds.filter(r => r.gameType !== 'passed' && r.player !== '-');
    const soloWins   = realRounds.filter(r => r.won).length;
    const soloTotal  = realRounds.length;
    const soloRate   = soloTotal > 0 ? ((soloWins / soloTotal) * 100).toFixed(1) : '0';
    const defRate    = soloTotal > 0 ? (((soloTotal - soloWins) / soloTotal) * 100).toFixed(1) : '0';
    return { soloRate, defRate, soloWins, soloTotal };
  }, [rounds]);

  /* ── 4. Führungswechsel ── */
  const leaderChanges = React.useMemo(() => {
    if (players.length < 2 || rounds.length < 2) return 0;
    const running = Object.fromEntries(players.map(p => [p, 0]));
    let leader = null;
    let changes = 0;
    rounds.forEach(r => {
      running[r.player] = (running[r.player] || 0) + r.gameValue;
      const newLeader = Object.entries(running).sort(([,a],[,b]) => b - a)[0][0];
      if (leader && newLeader !== leader) changes++;
      leader = newLeader;
    });
    return changes;
  }, [rounds, players]);

  /* ── 5. Comeback-Quote ── */
  const comebackRate = React.useMemo(() => {
    if (rounds.length < 4) return null;
    const mid = Math.floor(rounds.length / 2);
    const running = Object.fromEntries(players.map(p => [p, 0]));
    rounds.slice(0, mid).forEach(r => { running[r.player] = (running[r.player] || 0) + r.gameValue; });
    const midLeader = Object.entries(running).sort(([,a],[,b]) => b - a)[0][0];
    rounds.slice(mid).forEach(r => { running[r.player] = (running[r.player] || 0) + r.gameValue; });
    const finalLeader = Object.entries(running).sort(([,a],[,b]) => b - a)[0][0];
    return midLeader !== finalLeader;
  }, [rounds, players]);

  /* ── 6. Größter Swing (max Punktsprung in 5 aufeinanderfolgenden Runden) ── */
  const biggestSwing = React.useMemo(() => {
    if (rounds.length < 2) return null;
    const window = 5;
    let maxSwing = 0;
    let maxPlayer = null;
    const running = Object.fromEntries(players.map(p => [p, 0]));
    const snapshots = [];
    rounds.forEach(r => {
      running[r.player] = (running[r.player] || 0) + r.gameValue;
      snapshots.push({ ...running });
    });
    players.forEach(p => {
      for (let i = window; i < snapshots.length; i++) {
        const swing = Math.abs(snapshots[i][p] - snapshots[i - window][p]);
        if (swing > maxSwing) { maxSwing = swing; maxPlayer = p; }
      }
    });
    return maxSwing > 0 ? { swing: maxSwing, player: maxPlayer } : null;
  }, [rounds, players]);
  /* ── 6. Längste Serien (tischübergreifend) ── */
  const tableStreaks = React.useMemo(() => {
    const realRounds = rounds.filter(r => r.gameType !== 'passed' && r.player !== '-');
    let longestWin = 0, curWin = 0;
    let longestLoss = 0, curLoss = 0;
    realRounds.forEach(r => {
      if (r.won) { curWin++; curLoss = 0; if (curWin > longestWin) longestWin = curWin; }
      else        { curLoss++; curWin = 0; if (curLoss > longestLoss) longestLoss = curLoss; }
    });
    return { longestWin, longestLoss };
  }, [rounds]);
  const kpis = React.useMemo(() => {
    const totalGames = rounds.length;
    const totalPoints = rounds.reduce((s, r) => s + r.gameValue, 0);
    const avg = totalGames > 0 ? (totalPoints / totalGames).toFixed(1) : '0';
    const wins = rounds.filter(r => r.won).length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0';

    const wonRounds  = rounds.filter(r => r.won && r.player !== '-');
    const lostRounds = rounds.filter(r => !r.won && r.player !== '-');

    const bestValue = wonRounds.length  > 0 ? Math.max(...wonRounds.map(r => r.gameValue))  : null;
    const worstValue = lostRounds.length > 0 ? Math.min(...lostRounds.map(r => r.gameValue)) : null;

    const bestRound  = bestValue  !== null ? wonRounds.find(r => r.gameValue === bestValue)   : null;
    const worstRound = worstValue !== null ? lostRounds.find(r => r.gameValue === worstValue) : null;

    const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

    return {
      totalGames, totalPoints, avg, winRate,
      best:  bestRound  ? { value: bestValue,  player: bestRound.player,  type: bestRound.gameType,  round: bestRound.id,  date: fmtDate(bestRound.timestamp)  } : null,
      worst: worstRound ? { value: worstValue, player: worstRound.player, type: worstRound.gameType, round: worstRound.id, date: fmtDate(worstRound.timestamp) } : null,
    };
  }, [rounds]);

  const noData = rounds.length === 0;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Tischstatistik</h1>
        <p className="page-subtitle">Detaillierte Auswertung des Tisches. Analysiere Trends, Gewinnraten und Spieltypen.</p>
      </header>

      {/* ── KPI Cards ── */}
      <div className="statistik-kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p className="stat-label">Spiele gesamt</p>
          <p className="stat-value">{kpis.totalGames}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p className="stat-label">Ø Punkte / Spiel</p>
          <p className="stat-value" style={{ color: parseFloat(kpis.avg) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>{kpis.avg}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p className="stat-label">Gesamt-Score</p>
          <p className="stat-value" style={{ color: kpis.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
            {kpis.totalPoints >= 0 ? '+' : ''}{kpis.totalPoints}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p className="stat-label">Gewinnrate</p>
          <p className="stat-value" style={{ color: parseFloat(kpis.winRate) >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>{kpis.winRate}%</p>
        </div>
      </div>

      {/* ── Highlight-Kacheln ── */}
      <div className="statistik-highlight-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '3rem' }}>
        {kpis.best && (
          <div className="card statistik-highlight-card" style={{
            display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.25rem 2rem',
            background: 'linear-gradient(135deg, #d0a600, #a07800)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#1b1c1c', flexShrink: 0 }}>emoji_events</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="stat-label" style={{ color: '#1b1c1c', opacity: 0.65, marginBottom: '0.1rem' }}>↑ Spiel</p>
              <p className="stat-value" style={{ color: '#1b1c1c', fontSize: '1.75rem', lineHeight: 1 }}>
                +{kpis.best.value}
                <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.75rem', opacity: 0.8 }}>
                  {['grand', 'null', 'passed'].includes(kpis.best.type)
                    ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', lineHeight: 1, verticalAlign: 'middle' }}>
                        {kpis.best.type === 'grand' ? 'stars' : kpis.best.type === 'null' ? 'block' : 'skip_next'}
                      </span>
                    : SUIT_SYMBOLS[kpis.best.type]
                  }{' '}{SUIT_LABELS[kpis.best.type]}
                </span>
              </p>
            </div>
            <div className="statistik-highlight-meta" style={{ display: 'flex', gap: '2rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <p className="stat-label" style={{ color: '#1b1c1c', opacity: 0.65 }}>Spieler</p>
                <p style={{ fontWeight: 800, color: '#1b1c1c' }}>{kpis.best.player}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="stat-label" style={{ color: '#1b1c1c', opacity: 0.65 }}>Runde</p>
                <p style={{ fontWeight: 800, color: '#1b1c1c' }}>#{kpis.best.round}</p>
              </div>
              {kpis.best.date && (
                <div style={{ textAlign: 'right' }}>
                  <p className="stat-label" style={{ color: '#1b1c1c', opacity: 0.65 }}>Datum</p>
                  <p style={{ fontWeight: 800, color: '#1b1c1c' }}>{kpis.best.date}</p>
                </div>
              )}
            </div>
          </div>
        )}
        {kpis.worst && (
          <div className="card statistik-highlight-card" style={{
            display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.25rem 2rem',
            background: 'linear-gradient(135deg, var(--secondary), var(--secondary-container))',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--on-secondary)', flexShrink: 0 }}>heart_broken</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="stat-label" style={{ color: 'var(--on-secondary)', opacity: 0.65, marginBottom: '0.1rem' }}>↓ Niederlage</p>
              <p className="stat-value" style={{ color: 'var(--on-secondary)', fontSize: '1.75rem', lineHeight: 1 }}>
                {kpis.worst.value}
                <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.75rem', opacity: 0.8 }}>
                  {['grand', 'null', 'passed'].includes(kpis.worst.type)
                    ? <span className="material-symbols-outlined" style={{ fontSize: '1rem', lineHeight: 1, verticalAlign: 'middle' }}>
                        {kpis.worst.type === 'grand' ? 'stars' : kpis.worst.type === 'null' ? 'block' : 'skip_next'}
                      </span>
                    : SUIT_SYMBOLS[kpis.worst.type]
                  }{' '}{SUIT_LABELS[kpis.worst.type]}
                </span>
              </p>
            </div>
            <div className="statistik-highlight-meta" style={{ display: 'flex', gap: '2rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <p className="stat-label" style={{ color: 'var(--on-secondary)', opacity: 0.65 }}>Spieler</p>
                <p style={{ fontWeight: 800, color: 'var(--on-secondary)' }}>{kpis.worst.player}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="stat-label" style={{ color: 'var(--on-secondary)', opacity: 0.65 }}>Runde</p>
                <p style={{ fontWeight: 800, color: 'var(--on-secondary)' }}>#{kpis.worst.round}</p>
              </div>
              {kpis.worst.date && (
                <div style={{ textAlign: 'right' }}>
                  <p className="stat-label" style={{ color: 'var(--on-secondary)', opacity: 0.65 }}>Datum</p>
                  <p style={{ fontWeight: 800, color: 'var(--on-secondary)' }}>{kpis.worst.date}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {noData ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.4 }}>insert_chart</span>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Spieldaten vorhanden.</p>
          <p style={{ marginTop: '0.5rem' }}>Sobald die erste Runde beendet ist, erscheinen hier deine Charts.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* ── Punkteentwicklung (Line Chart) ── */}
          <section className="statistik-trend-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="headline" style={{ fontSize: '1.5rem' }}>Punkteentwicklung</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setXMode('rounds')}
                  className={`chip ${xMode === 'rounds' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>tag</span>
                  Runden
                </button>
                <button
                  onClick={() => setXMode('time')}
                  className={`chip ${xMode === 'time' ? 'active' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>calendar_month</span>
                  Zeit
                </button>
                {xMode === 'time' && (
                  <>
                    <div style={{ width: '1px', height: '1.5rem', backgroundColor: 'var(--outline-variant)', margin: '0 0.25rem' }} />
                    {[
                      { key: 'day',   label: 'Tag' },
                      { key: 'week',  label: 'KW' },
                      { key: 'month', label: 'Monat' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setTimeGranularity(key)}
                        className={`chip ${timeGranularity === key ? 'active' : ''}`}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        {label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="card">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={trendData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" strokeOpacity={0.35} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--outline)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--outline)' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.8125rem', fontWeight: 600 }} />
                  {players.map((p, i) => (
                    <Line key={p} type="monotone" dataKey={p} stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                      strokeWidth={2.5} activeDot={{ r: 5 }}
                      dot={xMode === 'rounds' ? makeAchievementDot(p, PLAYER_COLORS[i % PLAYER_COLORS.length]) : false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Spieltypen-Verteilung + neue Statistiken ── */}
          <div className="statistik-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

            {/* Pie Chart */}
            <section>
              <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spieltypen-Verteilung</h3>
              <div className="card">
                <GameTypePieChart typeDistribution={typeDistribution} rounds={rounds} player={null} />
              </div>
            </section>

            {/* Tisch-Statistiken */}
            <section>
              <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Tisch-Dynamik</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                {/* Erfolgsquoten */}
                <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
                  <p className="stat-label" style={{ marginBottom: '0.75rem' }}>Erfolgsquoten</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginBottom: '0.2rem' }}>⚔️ Alleinspieler</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: parseFloat(successRates.soloRate) >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>
                        {successRates.soloRate}%
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{successRates.soloWins} von {successRates.soloTotal}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginBottom: '0.2rem' }}>🛡️ Gegenspieler</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: parseFloat(successRates.defRate) >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>
                        {successRates.defRate}%
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{successRates.soloTotal - successRates.soloWins} von {successRates.soloTotal}</p>
                    </div>
                  </div>
                </div>

                {/* Längste Serien */}
                <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
                  <p className="stat-label" style={{ marginBottom: '0.75rem' }}>Längste Serien am Tisch</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginBottom: '0.2rem' }}>🏆 Siegesserie</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: tableStreaks.longestWin >= 5 ? 'var(--primary)' : 'var(--on-surface)' }}>
                        {tableStreaks.longestWin}×
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>aufeinanderfolgende Siege</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginBottom: '0.2rem' }}>💀 Niederlagenserie</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: tableStreaks.longestLoss >= 5 ? 'var(--secondary)' : 'var(--on-surface)' }}>
                        {tableStreaks.longestLoss}×
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>aufeinanderfolgende Niederlagen</p>
                    </div>
                  </div>
                </div>

                {/* Führungswechsel */}
                <div className="card" style={{ backgroundColor: 'var(--surface-low)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--primary)', flexShrink: 0 }}>swap_vert</span>
                  <div>
                    <p className="stat-label">Führungswechsel</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>{leaderChanges}×</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>Wechsel der Tabellenführung</p>
                  </div>
                </div>

                {/* Größter Push */}
                <div className="card" style={{ backgroundColor: 'var(--surface-low)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--tertiary)', flexShrink: 0 }}>bolt</span>
                  <div>
                    <p className="stat-label">Größter Push (5 Runden)</p>
                    {biggestSwing ? (
                      <>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>±{biggestSwing.swing}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{biggestSwing.player}</p>
                      </>
                    ) : (
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--outline)' }}>–</p>
                    )}
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* ── Histogramm ── */}
          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Verteilung der Spielwerte</h3>
            <div className="card">
              <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginBottom: '0.75rem' }}>Häufigkeit der Spielwerte in 24-Punkte-Bins — grün = Siege, rot = Niederlagen</p>
              <GameValueHistogram rounds={rounds} />
            </div>
          </section>

          {/* ── Heatmap ── */}
          <section>
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Gewinnrate: Spieler × Spieltyp</h3>
            <div className="card">
              <p style={{ fontSize: '0.7rem', color: 'var(--outline)', marginBottom: '1rem' }}>Wie gut ist jeder Spieler in welcher Spielart? Grün = hohe Gewinnrate, Rot = niedrige.</p>
              <GameTypeHeatmap rounds={rounds} players={players} />
            </div>
          </section>

          {/* ── Spiellisten-Übersicht ── */}
          {spiellisten.length > 0 && (() => {
            const selectedListe = spiellisten.find(l => l.id === selectedSpiellisteId) ?? null;
            const selListRounds = selectedListe ? rounds.filter(r => r.spiellisteId === selectedSpiellisteId) : [];
            const selStats = selectedListe ? computeListStats(players, selListRounds) : null;
            const selProgress = selectedListe ? computeListProgress(selectedListe, selListRounds) : null;
            const statusLabel = (s) => s === 'aktiv' ? 'Aktiv' : 'Abgeschlossen';
            const statusColor = (s) => s === 'aktiv' ? 'var(--primary)' : 'var(--outline)';

            return (
              <section>
                <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spiellisten</h3>
                <div style={{ display: 'grid', gridTemplateColumns: selectedListe ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}
                     className="spiellisten-grid">

                  {/* List cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {spiellisten.map((liste, idx) => {
                      const lRounds = rounds.filter(r => r.spiellisteId === liste.id);
                      const lProgress = computeListProgress(liste, lRounds);
                      const isSelected = liste.id === selectedSpiellisteId;
                      return (
                        <div
                          key={liste.id}
                          className="card"
                          onClick={() => setSelectedSpiellisteId(isSelected ? null : liste.id)}
                          style={{
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                            backgroundColor: 'var(--surface-low)',
                            transition: 'border-color 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '2rem', height: '2rem', borderRadius: '50%',
                              backgroundColor: PLAYER_COLORS[idx % PLAYER_COLORS.length] + '33',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}>{idx + 1}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>{liste.name}</p>
                                <span style={{
                                  fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                                  borderRadius: '0.25rem', backgroundColor: statusColor(liste.status) + '22',
                                  color: statusColor(liste.status),
                                }}>{statusLabel(liste.status)}</span>
                              </div>
                              <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
                                {lRounds.length} / {liste.roundCount} Runden
                                {lRounds.length > 0 && (
                                  <span style={{ marginLeft: '0.5rem' }}>
                                    · {new Date(lRounds[0].timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                  </span>
                                )}
                                {liste.status === 'abgeschlossen' && liste.winner?.length > 0 && (
                                  <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                                    🏆 {liste.winner.join(', ')}
                                  </span>
                                )}
                              </p>
                            </div>
                            {lProgress && (
                              <div style={{ width: '60px', height: '5px', backgroundColor: 'var(--outline-variant)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ height: '100%', width: `${Math.min((lProgress.current / lProgress.total) * 100, 100)}%`, backgroundColor: 'var(--primary)', borderRadius: '3px' }} />
                              </div>
                            )}
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--outline)', flexShrink: 0 }}>
                              {isSelected ? 'expand_less' : 'chevron_right'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Drill-down */}
                  {selectedListe && selStats && (
                    <div className="card" style={{ position: 'sticky', top: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{selectedListe.name}</h4>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
                            {selStats.playedRounds} von {selectedListe.roundCount} Runden gespielt
                          </p>
                        </div>
                        {selectedListe.status === 'aktiv' && (
                          <button
                            onClick={() => closeSpielliste(selectedListe.id)}
                            className="chip"
                            style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)', flexShrink: 0 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>stop_circle</span>
                            Abschließen
                          </button>
                        )}
                      </div>
                      {selProgress && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--outline)', marginBottom: '0.3rem' }}>
                            <span>Fortschritt</span>
                            <span>Runde {selProgress.current} von {selProgress.total}</span>
                          </div>
                          <div style={{ height: '6px', backgroundColor: 'var(--outline-variant)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min((selProgress.current / selProgress.total) * 100, 100)}%`, backgroundColor: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selStats.sortedPlayers.map((p, rank) => {
                          const isWinner = selectedListe.status === 'abgeschlossen' && selectedListe.winner?.includes(p.name);
                          return (
                            <div key={p.name} style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem',
                              padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
                              backgroundColor: isWinner ? 'rgba(208,166,0,0.12)' : 'var(--surface-low)',
                              border: isWinner ? '1px solid rgba(208,166,0,0.4)' : '1px solid transparent',
                            }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--outline)', width: '1.25rem', textAlign: 'center', flexShrink: 0 }}>{rank + 1}.</span>
                              <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>{isWinner && '🏆 '}{p.name}</span>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: (p.seeger + p.raw) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                                  {(p.seeger + p.raw) >= 0 ? '+' : ''}{p.seeger + p.raw}
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>Gesamt</p>
                              </div>
                              <div style={{ textAlign: 'right', minWidth: '60px' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", color: p.raw >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
                                  {p.raw >= 0 ? '+' : ''}{p.raw}
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>Rohpunkte</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}



        </div>
      )}
    </div>
  );
};

export default StatistikenCharts;
