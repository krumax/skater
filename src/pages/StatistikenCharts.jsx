import React from 'react';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../lib/skatScoring';
import { SUIT_COLORS, PLAYER_COLORS } from '../lib/tokens';
import GameTypePieChart from '../components/analytics/GameTypePieChart';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

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
  return (
    <div style={{
      background: 'var(--surface)', padding: '0.75rem 1rem', borderRadius: '0.5rem',
      boxShadow: '0 8px 24px var(--shadow-color)', fontSize: '0.8125rem',
    }}>
      <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────── */

const StatistikenCharts = () => {
  const { rounds, players: allPlayers } = useGame();
  const players = allPlayers.filter(p => p !== '-');

  /* ── 1. Punkteentwicklung (cumulative score per player per round) ── */
  const trendData = React.useMemo(() => {
    const running = {};
    players.forEach(p => { running[p] = 0; });
    return rounds.map((r, idx) => {
      // Accumulate standard points for the declarer
      running[r.player] = (running[r.player] || 0) + r.gameValue;
      return { name: `R${idx + 1}`, ...{ ...running } };
    });
  }, [rounds, players]);

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
    const best = totalGames > 0 ? Math.max(...rounds.map(r => r.gameValue)) : 0;
    const bestRound = rounds.find(r => r.gameValue === best);
    const bestLabel = bestRound
      ? `${SUIT_LABELS[bestRound.gameType] || bestRound.gameType} (+${best})`
      : '–';
    const wins = rounds.filter(r => r.won).length;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0';
    return { totalGames, totalPoints, avg, bestLabel, winRate };
  }, [rounds]);

  const noData = rounds.length === 0;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Statistiken & Analysen</h1>
        <p className="page-subtitle">Detaillierte Auswertung deiner Skat-Runden. Analysiere Trends, Gewinnraten und Spieltypen.</p>
      </header>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
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
            <h3 className="headline" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Punkteentwicklung</h3>
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
                      strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
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

          {/* ── Bestes Spiel Highlight ── */}
          <section>
            <div className="card" style={{
              display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem',
              background: 'linear-gradient(135deg, var(--tertiary), var(--tertiary-container))',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--on-surface)' }}>emoji_events</span>
              <div>
                <p style={{ ...statLabel, color: 'var(--on-surface)', opacity: 0.7 }}>Bestes Spiel der Session</p>
                <p style={{ ...statValue, color: 'var(--on-surface)', fontSize: '2rem' }}>{kpis.bestLabel}</p>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <p style={{ ...statLabel, color: 'var(--on-surface)', opacity: 0.7 }}>Spiele insgesamt</p>
                <p style={{ ...statValue, color: 'var(--on-surface)', fontSize: '2rem' }}>{kpis.totalGames}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default StatistikenCharts;
