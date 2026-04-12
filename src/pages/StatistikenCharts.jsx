import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { SUIT_COLORS, PLAYER_COLORS } from '../lib/tokens';
import { computeAchievementUnlocks } from '../lib/playerStats';
import GameTypePieChart from '../components/analytics/GameTypePieChart';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
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

/* ── Reusable label style constants ── */
const statLabel = {
  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.25rem',
};
const statValue = {
  fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif",
};

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
  const { rounds, players: allPlayers } = useGame();
  const players = allPlayers.filter(p => p !== '-');
  const [xMode, setXMode] = useState('rounds'); // 'rounds' | 'time'

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
    const granularity = detectTimeGranularity(rounds);
    const buckets = {};   // key → { label, playerTotals }
    const running = {};
    players.forEach(p => { running[p] = 0; });

    rounds.forEach(r => {
      if (!r.timestamp) return;
      running[r.player] = (running[r.player] || 0) + r.gameValue;
      const key   = bucketKey(r.timestamp, granularity);
      const label = formatTimeBucket(r.timestamp, granularity);
      buckets[key] = { name: label, ...Object.fromEntries(players.map(p => [p, running[p]])) };
    });

    return Object.values(buckets);
  }, [rounds, players]);

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

  /* ── 3. Gewinnraten nach Typ (bar chart data) ── */
  const winRateData = React.useMemo(() => {
    const map = {};
    rounds.forEach(r => {
      const t = r.gameType || 'unknown';
      if (!map[t]) map[t] = { total: 0, wins: 0 };
      map[t].total += 1;
      if (r.won) map[t].wins += 1;
    });
    return Object.entries(map)
      .map(([type, { total, wins }]) => ({
        type,
        name: (SUIT_SYMBOLS[type] ? SUIT_SYMBOLS[type] + ' ' : '') + (SUIT_LABELS[type] || type),
        winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        total,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [rounds]);
  /* ── 4. KPIs ── */
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={statLabel}>Spiele gesamt</p>
          <p style={statValue}>{kpis.totalGames}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={statLabel}>Ø Punkte / Spiel</p>
          <p style={{ ...statValue, color: parseFloat(kpis.avg) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>{kpis.avg}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={statLabel}>Gesamt-Score</p>
          <p style={{ ...statValue, color: kpis.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
            {kpis.totalPoints >= 0 ? '+' : ''}{kpis.totalPoints}
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={statLabel}>Gewinnrate</p>
          <p style={{ ...statValue, color: parseFloat(kpis.winRate) >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>{kpis.winRate}%</p>
        </div>
      </div>

      {/* ── Highlight-Kacheln ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '3rem' }}>
        {kpis.best && (
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.25rem 2rem',
            background: 'linear-gradient(135deg, #d0a600, #a07800)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#1b1c1c', flexShrink: 0 }}>emoji_events</span>
            <div style={{ flex: 1 }}>
              <p style={{ ...statLabel, color: '#1b1c1c', opacity: 0.65, marginBottom: '0.1rem' }}>Bestes Spiel der Session</p>
              <p style={{ ...statValue, color: '#1b1c1c', fontSize: '1.75rem', lineHeight: 1 }}>
                +{kpis.best.value}
                <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.75rem', opacity: 0.8 }}>
                  {SUIT_SYMBOLS[kpis.best.type]} {SUIT_LABELS[kpis.best.type]}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...statLabel, color: '#1b1c1c', opacity: 0.65 }}>Alleinspieler</p>
                <p style={{ fontWeight: 800, color: '#1b1c1c' }}>{kpis.best.player}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...statLabel, color: '#1b1c1c', opacity: 0.65 }}>Runde</p>
                <p style={{ fontWeight: 800, color: '#1b1c1c' }}>#{kpis.best.round}</p>
              </div>
              {kpis.best.date && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ ...statLabel, color: '#1b1c1c', opacity: 0.65 }}>Datum</p>
                  <p style={{ fontWeight: 800, color: '#1b1c1c' }}>{kpis.best.date}</p>
                </div>
              )}
            </div>
          </div>
        )}
        {kpis.worst && (
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.25rem 2rem',
            background: 'linear-gradient(135deg, var(--secondary), var(--secondary-container))',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--on-secondary)', flexShrink: 0 }}>heart_broken</span>
            <div style={{ flex: 1 }}>
              <p style={{ ...statLabel, color: 'var(--on-secondary)', opacity: 0.65, marginBottom: '0.1rem' }}>Höchste Niederlage der Session</p>
              <p style={{ ...statValue, color: 'var(--on-secondary)', fontSize: '1.75rem', lineHeight: 1 }}>
                {kpis.worst.value}
                <span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.75rem', opacity: 0.8 }}>
                  {SUIT_SYMBOLS[kpis.worst.type]} {SUIT_LABELS[kpis.worst.type]}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...statLabel, color: 'var(--on-secondary)', opacity: 0.65 }}>Alleinspieler</p>
                <p style={{ fontWeight: 800, color: 'var(--on-secondary)' }}>{kpis.worst.player}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ ...statLabel, color: 'var(--on-secondary)', opacity: 0.65 }}>Runde</p>
                <p style={{ fontWeight: 800, color: 'var(--on-secondary)' }}>#{kpis.worst.round}</p>
              </div>
              {kpis.worst.date && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ ...statLabel, color: 'var(--on-secondary)', opacity: 0.65 }}>Datum</p>
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
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className="headline" style={{ fontSize: '1.5rem' }}>Punkteentwicklung</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      strokeWidth={2.5} dot={false} activeDot={{ r: 5 }}
                      dot={xMode === 'rounds' ? makeAchievementDot(p, PLAYER_COLORS[i % PLAYER_COLORS.length]) : false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Spieltypen-Verteilung + Gewinnraten (two-column) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

            {/* Pie Chart */}
            <section>
              <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Spieltypen-Verteilung</h3>
              <div className="card">
                <GameTypePieChart typeDistribution={typeDistribution} rounds={rounds} player={null} />
              </div>
            </section>

            {/* Bar Chart */}
            <section>
              <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Gewinnraten nach Typ</h3>
              <div className="card">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={winRateData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" strokeOpacity={0.35} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--outline)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--outline)' }} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="winRate" name="Gewinnrate" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {winRateData.map((entry, i) => (
                        <Cell key={i} fill={SUIT_COLORS[entry.type] || PLAYER_COLORS[i % PLAYER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

        </div>
      )}
    </div>
  );
};

export default StatistikenCharts;
