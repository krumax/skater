import { useState, useMemo } from 'react';
import { useProfileData } from '../hooks/useProfileData';
import GameTypePieChart from '../components/analytics/GameTypePieChart';
import SuitBadge from '../components/SuitBadge';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  computePlayerTotals,
  computeSeegerTotals,
  computePlayerRank,
  computeRunningTotals,
} from '../lib/playerStats';

// ── Linked Sessions Section ───────────────────────────────────────────────────
function LinkedSessionsSection({ linkedSessions, loading, error, refetch, onSessionClick }) {
  // Error state with retry
  if (error) {
    return (
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Verknüpfte Tische</h2>
        <div className="card" style={{ backgroundColor: 'var(--error-container, #fdecea)', padding: '1.5rem' }}>
          <p style={{ color: 'var(--on-error-container, #d32f2f)', marginBottom: '1rem' }}>
            Fehler beim Laden der verknüpften Tische.
          </p>
          <button
            onClick={refetch}
            className="chip active"
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
          >
            Erneut versuchen
          </button>
        </div>
      </section>
    );
  }

  // Loading state
  if (loading) {
    return (
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Verknüpfte Tische</h2>
        <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        </div>
      </section>
    );
  }

  // Empty state — onboarding hint
  if (!linkedSessions || linkedSessions.length === 0) {
    return (
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Verknüpfte Tische</h2>
        <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '2rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline)', marginBottom: '0.75rem', display: 'block' }}>
            link_off
          </span>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 600 }}>
            Noch keine Tische verknüpft.
          </p>
          <p style={{ color: 'var(--outline)', fontSize: '0.875rem', maxWidth: '28rem', margin: '0 auto' }}>
            Bitte den Tischersteller um einen Einladungslink, um deinen Spielerslot zu claimen und den Tisch hier zu sehen.
          </p>
        </div>
      </section>
    );
  }

  // Render session list
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Verknüpfte Tische</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {linkedSessions.map(session => (
          <div
            key={session.sessionId}
            className="card"
            role="button"
            tabIndex={0}
            onClick={() => onSessionClick?.(session.sessionId)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSessionClick?.(session.sessionId); } }}
            style={{ backgroundColor: 'var(--surface-low)', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                  {session.tableName || 'Unbenannter Tisch'}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  Spieler: {session.displayName}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)' }}>
                    {session.totalRounds}
                  </p>
                  <p className="stat-label">Runden</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--outline)' }}>
                  chevron_right
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Read-Only Session Detail View (Req 5.1, 5.2, 5.3, 5.4, 5.6, 5.7) ────────
function ReadOnlySessionDetail({ sessionDetail, loading, error, onBack }) {
  // Loading state
  if (loading) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Mein Profil</h1>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <span style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⟳</span>
        </div>
      </div>
    );
  }

  // Error state — access denied or network error (Req 5.6, 5.7)
  if (error || !sessionDetail) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Mein Profil</h1>
        </header>
        <div className="card" style={{ backgroundColor: 'var(--error-container, #fdecea)', padding: '1.5rem' }}>
          <p style={{ color: 'var(--on-error-container, #d32f2f)', marginBottom: '1rem' }}>
            {error || 'Session nicht verfügbar.'}
          </p>
          <button
            onClick={onBack}
            className="chip active"
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const { session, rounds } = sessionDetail;
  const seating = session?.seating ?? [];
  const players = seating.filter(p => p !== '-');
  const tableName = session?.table_name || 'Unbenannter Tisch';

  return (
    <div>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <button
            onClick={onBack}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            aria-label="Zurück zur Übersicht"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>
              arrow_back
            </span>
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>{tableName}</h1>
        </div>
        <p className="page-subtitle">
          {rounds.length} Runden · Nur-Lesen-Ansicht
        </p>
      </header>

      {/* Read-only badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        fontSize: '0.8rem', fontWeight: 700, color: 'var(--outline)',
        backgroundColor: 'var(--surface-high)', padding: '0.35rem 0.75rem',
        borderRadius: '999px', marginBottom: '1.5rem',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>visibility</span>
        Nur Lesen
      </div>

      {/* Session statistics (Req 5.2) */}
      <ReadOnlySessionStats rounds={rounds} />

      {/* Rankings (Req 5.2) */}
      <ReadOnlyRankings players={players} rounds={rounds} />

      {/* Round history table — no edit/delete controls (Req 5.1, 5.3, 5.4) */}
      <ReadOnlyRoundHistory rounds={rounds} players={players} />
    </div>
  );
}

// ── Read-Only Session Stats ───────────────────────────────────────────────────
function ReadOnlySessionStats({ rounds }) {
  const wonCount = rounds.filter(r => r.won && r.gameType !== 'passed').length;
  const lostCount = rounds.filter(r => !r.won && r.gameType !== 'passed').length;
  const passedCount = rounds.filter(r => r.gameType === 'passed').length;

  return (
    <div className="stats-grid-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
      <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
        <p className="stat-label">Runden gesamt</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.length}</p>
      </div>
      <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
        <p className="stat-label">Gewonnen</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{wonCount}</p>
      </div>
      <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
        <p className="stat-label">Verloren</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{lostCount}</p>
      </div>
      <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
        <p className="stat-label">Eingepasst</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--outline)' }}>{passedCount}</p>
      </div>
    </div>
  );
}

// ── Read-Only Rankings (Req 5.2) ──────────────────────────────────────────────
function ReadOnlyRankings({ players, rounds }) {
  const standardTotals = computePlayerTotals(players, rounds);
  const seegerTotals = computeSeegerTotals(players, rounds);
  const standardRank = computePlayerRank(players, rounds, false);
  const seegerRank = computePlayerRank(players, rounds, true);

  // Combined ranking
  const combinedRank = players
    .map(p => ({ name: p, score: (standardTotals[p] ?? 0) + (seegerTotals[p] ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
      {/* Standard */}
      <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
        <h3 className="headline" style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>calculate</span>
          Standardwertung
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {standardRank.map(entry => (
            <ReadOnlyRankingRow key={entry.name} rank={entry.rank} name={entry.name} score={entry.score} />
          ))}
        </div>
      </div>

      {/* Seeger-Fabian */}
      <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
        <h3 className="headline" style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>trophy</span>
          Seeger-Fabian
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {seegerRank.map(entry => (
            <ReadOnlyRankingRow key={entry.name} rank={entry.rank} name={entry.name} score={entry.score} />
          ))}
        </div>
      </div>

      {/* Combined */}
      <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
        <h3 className="headline" style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>merge</span>
          Kombiniert
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {combinedRank.map(entry => (
            <ReadOnlyRankingRow key={entry.name} rank={entry.rank} name={entry.name} score={entry.score} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Read-Only Ranking Row ─────────────────────────────────────────────────────
function ReadOnlyRankingRow({ rank, name, score }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: rank === 1 ? 'var(--tertiary-container)' : 'var(--surface-high)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
        }}>{rank}</span>
        <span style={{ fontWeight: 600 }}>{name}</span>
      </div>
      <span style={{
        fontWeight: 800, fontSize: '1.5rem',
        fontFamily: "'Manrope', sans-serif",
        color: score >= 0 ? 'var(--primary)' : 'var(--secondary)',
      }}>
        {score >= 0 ? `+${score}` : `${score}`}
      </span>
    </div>
  );
}

// ── Read-Only Round History (Req 5.1, 5.3) ────────────────────────────────────
function ReadOnlyRoundHistory({ rounds, players }) {
  const VISIBLE_TAIL = 10;
  const [expanded, setExpanded] = useState(false);

  const { runningStd, runningSF } = useMemo(
    () => computeRunningTotals(players, rounds),
    [players, rounds]
  );

  const splitAt = Math.max(0, rounds.length - VISIBLE_TAIL);
  const olderRounds = rounds.slice(0, splitAt);
  const recentRounds = rounds.slice(splitAt);
  const scoreColWidth = players.length >= 4 ? 3.5 : 4;

  if (rounds.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--outline)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>playing_cards</span>
        <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Runden gespielt.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Spielverlauf</h2>
      <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
        <table className="mobile-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--outline-variant)' }}>
              <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', width: '2.5rem' }}>#</th>
              <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', width: '6rem' }}>Spieler</th>
              <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', width: '2.5rem' }}>Typ</th>
              <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textAlign: 'right', width: '3.5rem' }}>Pkt.</th>
              <th style={{ width: '1px', padding: 0, borderLeft: '2px solid var(--outline-variant)' }}></th>
              {players.map(p => (
                <th key={`std-${p}`} style={{ padding: '0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textAlign: 'center', width: `${scoreColWidth}rem` }}>
                  <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--outline)' }}>STD</span>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>
                    {p.length > 8 ? p.slice(0, 8) + '…' : p}
                  </span>
                </th>
              ))}
              <th style={{ width: '1px', padding: 0, borderLeft: '2px solid var(--outline-variant)' }}></th>
              {players.map(p => (
                <th key={`sf-${p}`} style={{ padding: '0.5rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--on-surface-variant)', textAlign: 'center', width: `${scoreColWidth}rem` }}>
                  <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--primary)' }}>Σ</span>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>
                    {p.length > 8 ? p.slice(0, 8) + '…' : p}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ fontFamily: 'Work Sans, sans-serif' }}>
            {/* Older rounds (collapsible) */}
            {olderRounds.length > 0 && (
              <>
                {expanded && olderRounds.map((r, idx) => (
                  <ReadOnlyRoundRow key={r._dbId ?? `old-${idx}`} r={r} idx={idx} players={players}
                    std={runningStd[idx]} sf={runningSF[idx]} />
                ))}
                <tr style={{ backgroundColor: 'var(--surface-high)' }}>
                  <td colSpan={5 + players.length * 2} style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setExpanded(e => !e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--outline)', fontFamily: 'inherit', padding: '0.25rem 0.75rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>
                        {expanded ? 'expand_less' : 'expand_more'}
                      </span>
                      {expanded
                        ? `${olderRounds.length} ältere Runden ausblenden`
                        : `${olderRounds.length} ältere Runden einblenden`}
                    </button>
                  </td>
                </tr>
              </>
            )}
            {/* Recent rounds (always visible) */}
            {recentRounds.map((r, i) => {
              const idx = splitAt + i;
              return (
                <ReadOnlyRoundRow key={r._dbId ?? `recent-${i}`} r={r} idx={idx} players={players}
                  std={runningStd[idx]} sf={runningSF[idx]} />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Read-Only Round Row (no edit/delete actions) ──────────────────────────────
function ReadOnlyRoundRow({ r, idx, players, std, sf }) {
  const tdStyle = { padding: '0.5rem 0.75rem', fontSize: '0.8125rem', verticalAlign: 'middle' };

  return (
    <tr style={{
      borderBottom: '1px solid var(--surface-high)',
      backgroundColor: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface-low)',
    }}>
      <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--outline)' }}>{r.id}</td>
      <td style={{ ...tdStyle, fontWeight: 600, color: r.won ? 'var(--on-surface)' : 'var(--secondary)' }}>{r.player}</td>
      <td style={tdStyle}>
        <SuitBadge gameType={r.gameType} size="xl" variant="plain" />
      </td>
      <td style={{ ...tdStyle, fontWeight: 800, textAlign: 'right', color: r.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
        {r.isBock && (
          <span style={{
            display: 'inline-block', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
            backgroundColor: 'var(--tertiary-container)', color: 'var(--on-tertiary-container, #fff)',
            padding: '0.1rem 0.35rem', borderRadius: '0.25rem', marginRight: '0.4rem', verticalAlign: 'middle',
          }}>Bock</span>
        )}
        {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
      </td>
      <td style={{ width: '1px', padding: 0, borderLeft: '2px solid var(--outline-variant)' }}></td>
      {players.map(p => (
        <td key={`std-${p}`} style={{ ...tdStyle, textAlign: 'center', fontFamily: "'Manrope', sans-serif", fontWeight: 600, color: (std?.[p] ?? 0) >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
          {std?.[p] ?? 0}
        </td>
      ))}
      <td style={{ width: '1px', padding: 0, borderLeft: '2px solid var(--outline-variant)' }}></td>
      {players.map(p => (
        <td key={`sf-${p}`} style={{ ...tdStyle, textAlign: 'center', fontFamily: "'Manrope', sans-serif", fontWeight: 600, color: (sf?.[p] ?? 0) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
          {sf?.[p] ?? 0}
        </td>
      ))}
    </tr>
  );
}

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
  const {
    stats, sessionSummaries, rounds, loading, error, reload,
    linkedSessions, linkedSessionsLoading, linkedSessionsError, refetchLinkedSessions,
    sessionDetail, sessionDetailLoading, sessionDetailError, loadSessionDetail, clearSessionDetail,
  } = useProfileData();

  // ── Session detail view (Req 5.1, 5.2, 5.3, 5.4, 5.6, 5.7) ──
  if (sessionDetail || sessionDetailLoading || sessionDetailError) {
    return (
      <ReadOnlySessionDetail
        sessionDetail={sessionDetail}
        loading={sessionDetailLoading}
        error={sessionDetailError}
        onBack={clearSessionDetail}
      />
    );
  }

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
        <LinkedSessionsSection
          linkedSessions={linkedSessions}
          loading={linkedSessionsLoading}
          error={linkedSessionsError}
          refetch={refetchLinkedSessions}
          onSessionClick={loadSessionDetail}
        />
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

      {/* ── Linked sessions list ── */}
      <LinkedSessionsSection
        linkedSessions={linkedSessions}
        loading={linkedSessionsLoading}
        error={linkedSessionsError}
        refetch={refetchLinkedSessions}
        onSessionClick={loadSessionDetail}
      />

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
