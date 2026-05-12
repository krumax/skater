import { useState } from 'react';
import { useProfileData } from '../hooks/useProfileData';
import GameTypePieChart from '../components/analytics/GameTypePieChart';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Stat-Kachel (reused pattern from PlayerAnalytics) ─────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
    </div>
  );
}

// ── Collapsible session card ──────────────────────────────────────────────────
function SessionCard({ summary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          all: 'unset', cursor: 'pointer', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
        aria-expanded={open}
      >
        <span style={{ fontWeight: 700 }}>
          {summary.tableName || 'Unbenannter Tisch'}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>
      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <p className="stat-label">Rundenanzahl</p>
            <p style={{ fontWeight: 700 }}>{summary.roundCount}</p>
          </div>
          <div>
            <p className="stat-label">Gewinnrate</p>
            <p style={{ fontWeight: 700, color: summary.winRate >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>
              {summary.winRate.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Sentinel player name used for GameTypePieChart filtering
const PROFILE_PLAYER = '__profile__';

// ── Main page component ───────────────────────────────────────────────────────
const MeinProfil = () => {
  const { stats, sessionSummaries, rounds, loading, error, reload } = useProfileData();

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: '60vh',
      }}>
        <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⟳</span>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Mein Profil</h1>
        </header>
        <div className="card" style={{ backgroundColor: 'var(--error-container, #fdecea)', padding: '1.5rem' }}>
          <p style={{ color: 'var(--on-error-container, #d32f2f)', marginBottom: '1rem' }}>
            Fehler beim Laden der Profildaten: {error}
          </p>
          <button
            onClick={reload}
            className="chip active"
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state (no stats or no declarer games) ──
  if (!stats || stats.totalDeclarerGames === 0) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Mein Profil</h1>
          <p className="page-subtitle">Deine tischübergreifende Statistik.</p>
        </header>
        <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '2rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline)', marginBottom: '1rem', display: 'block' }}>
            person_add
          </span>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 600 }}>
            Noch keine Runden vorhanden.
          </p>
          <p style={{ color: 'var(--outline)', fontSize: '0.875rem', maxWidth: '28rem', margin: '0 auto' }}>
            Um deine Runden hier zu sehen, muss dein Spielerslot an einem Tisch mit deinem Account verknüpft sein.
            Der Tischersteller kann dir einen Einladungslink senden, über den du deinen Slot claimen kannst.
          </p>
        </div>
      </div>
    );
  }

  // ── Data loaded — render full profile ──
  // Build declarer rounds with a sentinel player name for GameTypePieChart compatibility.
  // GameTypePieChart filters by `r.player === player` to compute per-type win rates.
  const declarerRounds = rounds
    .filter(r => r.player === r.playerName)
    .map(r => ({ ...r, player: PROFILE_PLAYER }));

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Mein Profil</h1>
        <p className="page-subtitle">Deine tischübergreifende Statistik.</p>
      </header>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label="Gesamtrunden als Ansager"
          value={stats.totalDeclarerGames}
          color="var(--on-surface)"
        />
        <StatCard
          label="Gesamtpunkte"
          value={stats.totalPoints >= 0 ? `+${stats.totalPoints}` : `${stats.totalPoints}`}
          color={stats.totalPoints >= 0 ? 'var(--primary)' : 'var(--secondary)'}
        />
        <StatCard
          label="Gewinnrate"
          value={`${stats.winRate.toFixed(1)}%`}
          color={stats.winRate >= 50 ? 'var(--primary)' : 'var(--secondary)'}
        />
      </div>

      {/* ── Per-session collapsible cards ── */}
      {sessionSummaries.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Tischübersicht</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessionSummaries.map(s => (
              <SessionCard key={s.sessionId} summary={s} />
            ))}
          </div>
        </section>
      )}

      {/* ── Charts section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'start', marginBottom: '2rem' }}>
        {/* Points over time line chart */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)' }}>
          <p className="stat-label" style={{ marginBottom: '0.75rem' }}>Punkteverlauf</p>
          {stats.pointsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.pointsOverTime}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => ts ? new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ''}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(ts) => ts ? new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                  formatter={(value) => [`${value} Punkte`, 'Kumulativ']}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativePoints"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>
          )}
        </div>

        {/* Pie chart */}
        <div className="card" style={{ width: '380px', border: '1px solid var(--outline-variant)' }}>
          <p className="stat-label" style={{ marginBottom: '0.75rem' }}>Spielart-Verteilung &amp; Gewinnraten</p>
          {stats.typeDistribution.length > 0 ? (
            <GameTypePieChart
              typeDistribution={stats.typeDistribution}
              rounds={declarerRounds}
              player={PROFILE_PLAYER}
            />
          ) : (
            <p style={{ color: 'var(--outline)' }}>Noch keine Daten.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeinProfil;
