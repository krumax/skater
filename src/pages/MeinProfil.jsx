import { useState, useMemo } from 'react';
import { useProfileData } from '../hooks/useProfileData';
import ProfileGameMatrix from '../components/analytics/ProfileGameMatrix';
import SuitBadge from '../components/SuitBadge';
import {
  computePlayerRank,
  computeRunningTotals,
} from '../lib/playerStats';

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
  const standardRank = computePlayerRank(players, rounds, false);
  const seegerRank = computePlayerRank(players, rounds, true);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
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

// ── Read-Only Round History (Req 5.1, 5.3) — matches SkatScoreList styling ───
function ReadOnlyRoundHistory({ rounds, players }) {
  const VISIBLE_TAIL = 6;
  const [expanded, setExpanded] = useState(false);

  const { runningStd, runningSF } = useMemo(
    () => computeRunningTotals(players, rounds),
    [players, rounds]
  );

  const splitAt = Math.max(0, rounds.length - VISIBLE_TAIL);
  const olderRounds = rounds.slice(0, splitAt);
  const recentRounds = rounds.slice(splitAt);
  const scoreColWidth = players.length >= 4 ? 3.5 : 4;

  // Shared styles matching SkatScoreList
  const thStyle = { padding: '0.25rem 0.35rem', textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--outline)', letterSpacing: '0.08em', fontWeight: 700, whiteSpace: 'nowrap' };
  const thDivider = { width: '1px', padding: 0, backgroundColor: 'var(--outline-variant)' };

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
              <th className="col-round-nr" style={{ ...thStyle, width: '2.5rem' }}>#</th>
              <th style={{ ...thStyle, width: '6rem' }}>Spieler</th>
              <th className="col-type" style={{ ...thStyle, width: '2.5rem' }}>Typ</th>
              <th className="col-ansage" style={{ ...thStyle, textAlign: 'right', width: '3rem' }}>Ans.</th>
              <th className="col-modifier" style={{ ...thStyle, textAlign: 'left', paddingLeft: '0.25rem', color: 'var(--outline)', fontSize: '0.6rem', width: '3rem' }}>Mod.</th>
              <th style={{ ...thStyle, textAlign: 'right', width: '3.5rem' }}>Pkt.</th>
              <th className="score-col-divider" style={thDivider}></th>
              {players.map(p => (
                <th key={`std-${p}`} className="score-col-std" style={{ ...thStyle, textAlign: 'center', width: `${scoreColWidth}rem`, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--outline)' }}>STD</span>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>
                    {p.length > 8 ? p.slice(0, 8) + '…' : p}
                  </span>
                </th>
              ))}
              <th className="score-col-divider" style={thDivider}></th>
              {players.map(p => (
                <th key={`sf-${p}`} className="score-col-sf" style={{ ...thStyle, textAlign: 'center', width: `${scoreColWidth}rem`, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--primary)' }}>S-F</span>
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
                    std={runningStd[idx]} sf={runningSF[idx]}
                    sfPrev={idx > 0 ? runningSF[idx - 1] : null}
                    stdPrev={idx > 0 ? runningStd[idx - 1] : null} />
                ))}
                <tr style={{ backgroundColor: 'var(--surface-high)' }}>
                  <td colSpan={8 + players.length * 2} style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
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
                  std={runningStd[idx]} sf={runningSF[idx]}
                  sfPrev={idx > 0 ? runningSF[idx - 1] : null}
                  stdPrev={idx > 0 ? runningStd[idx - 1] : null} />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Read-Only Round Row — matches SkatScoreList RoundRow (no edit/delete) ─────
function ReadOnlyRoundRow({ r, idx, players, std, sf, sfPrev, stdPrev }) {
  const tdStyle = { padding: '0 0.35rem', whiteSpace: 'nowrap' };
  const tdDivider = { width: '1px', padding: 0, backgroundColor: 'var(--surface-high)' };

  return (
    <tr style={{
      borderBottom: '1px solid var(--surface-high)',
      backgroundColor: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface-low)',
    }}>
      <td className="col-round-nr" style={{ ...tdStyle, fontWeight: 800, color: 'var(--outline)' }}>{r.id}</td>
      <td style={{ ...tdStyle, fontWeight: 600, color: r.won ? 'var(--on-surface)' : 'var(--secondary)' }}>{r.player}</td>
      <td className="col-type" style={{ ...tdStyle, color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>
        <SuitBadge gameType={r.gameType} size="xl" variant="plain" />
      </td>
      {/* Ansage (Spitzen) */}
      <td className="col-ansage" style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--on-surface-variant)', fontFamily: "'Manrope', sans-serif", paddingRight: '0.25rem' }}>
        {(() => {
          const isNull = r.gameType === 'null';
          const isPassed = r.gameType === 'passed';
          if (isPassed) return <span style={{ color: 'var(--outline)', opacity: 0.4 }}>—</span>;
          if (isNull) return <span style={{ color: 'var(--outline)', opacity: 0.6 }}>—</span>;
          return r.spitzen != null
            ? <span style={{ color: 'var(--on-surface)' }}>
                {(r.mitOhne ?? 'mit') === 'ohne' ? '−' : '+'}{r.spitzen}
              </span>
            : <span style={{ color: 'var(--outline)', opacity: 0.4 }}>—</span>;
        })()}
      </td>
      {/* Modifier badges */}
      <td className="col-modifier" style={{ ...tdStyle, paddingLeft: '0.25rem', paddingRight: '0.5rem' }}>
        {(() => {
          const badges = [];
          if (r.hand) badges.push('H');
          if (r.schneider) badges.push('S');
          if (r.schwarz) badges.push('Sz');
          if (r.ouvert) badges.push('O');
          if (badges.length === 0) return null;
          return (
            <span style={{ display: 'inline-flex', gap: '0.15rem', flexWrap: 'nowrap' }}>
              {badges.map(b => (
                <span key={b} style={{
                  fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.02em',
                  backgroundColor: 'var(--surface-high)', color: 'var(--on-surface-variant)',
                  padding: '0.1rem 0.3rem', borderRadius: '0.25rem', lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}>{b}</span>
              ))}
            </span>
          );
        })()}
      </td>
      {/* Punkte */}
      <td style={{ ...tdStyle, fontWeight: 800, textAlign: 'right', color: r.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
        {r.isBock === true && (
          <span className="badge-bock" style={{
            display: 'inline-block', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
            backgroundColor: 'var(--tertiary-container)', color: 'var(--on-tertiary-container, #fff)',
            padding: '0.1rem 0.35rem', borderRadius: '0.25rem', marginRight: '0.4rem', verticalAlign: 'middle',
          }}>Bock</span>
        )}
        {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
      </td>
      {/* STD divider */}
      <td style={tdDivider} className="score-col-divider"></td>
      {/* STD running totals with highlight */}
      {players.map(p => {
        const curr = std?.[p] ?? 0;
        const prev = stdPrev?.[p] ?? 0;
        const delta = curr - prev;
        const changed = delta !== 0;
        const color = delta < 0 ? 'var(--secondary)' : 'var(--on-surface)';
        return (
          <td key={`std-${p}`} className="score-col-std" style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, opacity: changed ? 1 : 0.4, color }}>
            {curr}
          </td>
        );
      })}
      {/* SF divider */}
      <td style={tdDivider} className="score-col-divider"></td>
      {/* Σ combined totals (STD + SF) with highlight */}
      {players.map(p => {
        const total = sf?.[p] ?? 0;
        const sfDelta = (sf?.[p] ?? 0) - (sfPrev?.[p] ?? 0);
        const changed = sfDelta !== 0;
        const color = sfDelta < 0 ? 'var(--secondary)' : 'var(--on-surface)';
        return (
          <td key={`sf-${p}`} className="score-col-sf" style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, opacity: changed ? 1 : 0.4, color }}>
            {total}
          </td>
        );
      })}
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

// ── Session card (Spiellisten-style, expandable) ─────────────────────────────
function SessionCard({ summary, index, onSessionClick, isOwnTable }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="card"
      style={{
        backgroundColor: 'var(--surface-low)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        border: open ? '2px solid var(--primary)' : '2px solid transparent',
        borderLeft: isOwnTable ? '3px solid #d0a600' : '3px solid #0b3d2e',
      }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '2rem', height: '2rem', borderRadius: '50%',
          backgroundColor: isOwnTable ? '#d0a60022' : '#0b3d2e22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: isOwnTable ? '#d0a600' : '#0b3d2e' }}>
            {index + 1}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
              {summary.tableName || 'Unbenannter Tisch'}
            </p>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
            {summary.totalRounds} Runden
            {' · '}Gewinnrate{' '}
            <span style={{ fontWeight: 600, color: summary.winRate >= 50 ? 'var(--primary)' : 'var(--secondary)' }}>
              {summary.winRate.toFixed(1)}%
            </span>
            {' '}
            <span style={{ color: 'var(--on-surface-variant)' }}>
              ({summary.wins}/{summary.roundCount})
            </span>
            {' · '}Alleinspieler{' '}
            <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>
              {summary.declarerShare.toFixed(0)}%
            </span>
            {summary.leaderName && (
              <span style={{ marginLeft: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                🏆 {summary.leaderName}
              </span>
            )}
          </p>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--outline)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </div>

      {/* Expanded: player ranking (Spiellisten-style) */}
      {open && summary.sortedPlayers && summary.sortedPlayers.length > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--outline-variant)', paddingTop: '0.75rem' }}
             onClick={(e) => e.stopPropagation()}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '0.75rem' }}>
            {summary.totalRounds} von {summary.totalRounds} Runden gespielt
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summary.sortedPlayers.map((p, rank) => {
              const isLeader = rank === 0;
              const total = p.seeger + p.raw;
              return (
                <div
                  key={p.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
                    backgroundColor: isLeader ? 'rgba(208,166,0,0.12)' : 'var(--surface-high)',
                    border: isLeader ? '1px solid rgba(208,166,0,0.4)' : '1px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--outline)', width: '1.25rem', textAlign: 'center', flexShrink: 0 }}>
                    {rank + 1}.
                  </span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>
                    {isLeader && '🏆 '}{p.name}
                  </span>
                  <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", color: p.raw >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
                      {p.raw >= 0 ? '+' : ''}{p.raw}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>
                      Rohpunkte
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: total >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                      {total >= 0 ? '+' : ''}{total}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>
                      Gesamt
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Link to full detail view */}
          {onSessionClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onSessionClick(summary.sessionId); }}
              style={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginTop: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>open_in_new</span>
              Vollständige Ansicht
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Linked-only session card (no full stats, clickable for detail) ────────────
function LinkedSessionCard({ session, index, onClick, isOwnTable }) {
  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        backgroundColor: 'var(--surface-low)',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        border: '2px solid transparent',
        borderLeft: isOwnTable ? '3px solid #d0a600' : '3px solid #0b3d2e',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '2rem', height: '2rem', borderRadius: '50%',
          backgroundColor: isOwnTable ? '#d0a60022' : '#0b3d2e22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: isOwnTable ? '#d0a600' : '#0b3d2e' }}>
            {index + 1}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
              {session.tableName || 'Unbenannter Tisch'}
            </p>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
            {session.totalRounds} Runden
            {session.displayName && (
              <span style={{ marginLeft: '0.5rem' }}>· Spieler: {session.displayName}</span>
            )}
          </p>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--outline)', flexShrink: 0 }}>
          chevron_right
        </span>
      </div>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
const MeinProfil = () => {
  const {
    stats, sessionSummaries, rounds, loading, error, reload,
    currentUserId,
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
        <section style={{ marginBottom: '2rem' }}>
          <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Tischübersicht</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '3px', height: '0.75rem', backgroundColor: '#d0a600', borderRadius: '1px' }}></span>
              Von dir erstellt
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '3px', height: '0.75rem', backgroundColor: '#0b3d2e', borderRadius: '1px' }}></span>
              Eingeladen
            </span>
          </p>
          {linkedSessionsLoading ? (
            <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            </div>
          ) : linkedSessionsError ? (
            <div className="card" style={{ backgroundColor: 'var(--error-container, #fdecea)', padding: '1.5rem' }}>
              <p style={{ color: 'var(--on-error-container, #d32f2f)', marginBottom: '1rem' }}>
                Fehler beim Laden der Tische.
              </p>
              <button onClick={refetchLinkedSessions} className="chip active" style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}>
                Erneut versuchen
              </button>
            </div>
          ) : (linkedSessions && linkedSessions.length > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...linkedSessions].sort((a, b) => {
                const aOwn = a.createdBy === currentUserId ? 0 : 1;
                const bOwn = b.createdBy === currentUserId ? 0 : 1;
                return aOwn - bOwn;
              }).map((ls, idx) => (
                <LinkedSessionCard key={ls.sessionId} session={ls} index={idx} onClick={() => loadSessionDetail(ls.sessionId)} isOwnTable={ls.createdBy === currentUserId} />
              ))}
            </div>
          ) : (
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
          )}
        </section>
      </div>
    );
  }

  // ── Data loaded — render full profile ──
  // Build declarer rounds for the game matrix
  const declarerRounds = rounds
    .filter(r => r.player === r.playerName);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Mein Profil</h1>
        <p className="page-subtitle">Deine tischübergreifende Statistik.</p>
      </header>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard
          label="Siegquote"
          value={`${stats.winRate.toFixed(1)}%`}
          color={stats.winRate >= 50 ? 'var(--primary)' : 'var(--secondary)'}
        />
        <StatCard
          label="Alleinspieleranteil"
          value={`${stats.declarerShare.toFixed(1)}%`}
          color="var(--on-surface)"
        />
        <StatCard
          label="Spiele insgesamt"
          value={stats.totalRounds}
          color="var(--on-surface)"
        />
      </div>

      {/* ── Tischübersicht (merged: session summaries + linked sessions) ── */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="headline" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Tischübersicht</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '3px', height: '0.75rem', backgroundColor: '#d0a600', borderRadius: '1px' }}></span>
            Von dir erstellt
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '3px', height: '0.75rem', backgroundColor: '#0b3d2e', borderRadius: '1px' }}></span>
            Eingeladen
          </span>
        </p>
        {linkedSessionsLoading ? (
          <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          </div>
        ) : linkedSessionsError ? (
          <div className="card" style={{ backgroundColor: 'var(--error-container, #fdecea)', padding: '1.5rem' }}>
            <p style={{ color: 'var(--on-error-container, #d32f2f)', marginBottom: '1rem' }}>
              Fehler beim Laden der Tische.
            </p>
            <button
              onClick={refetchLinkedSessions}
              className="chip active"
              style={{ fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : (() => {
          // Merge: sessionSummaries (full stats) + linkedSessions that aren't already in summaries
          const summaryIds = new Set(sessionSummaries.map(s => s.sessionId));
          const linkedOnly = (linkedSessions || []).filter(ls => !summaryIds.has(ls.sessionId));
          const hasContent = sessionSummaries.length > 0 || linkedOnly.length > 0;

          if (!hasContent) {
            return (
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
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Own tables first, then invited — sorted within each group by original order */}
              {(() => {
                const ownSummaries = sessionSummaries.filter(s => s.createdBy === currentUserId);
                const invitedSummaries = sessionSummaries.filter(s => s.createdBy !== currentUserId);
                const ownLinked = linkedOnly.filter(ls => ls.createdBy === currentUserId);
                const invitedLinked = linkedOnly.filter(ls => ls.createdBy !== currentUserId);

                const ownAll = [...ownSummaries.map(s => ({ type: 'session', data: s })), ...ownLinked.map(ls => ({ type: 'linked', data: ls }))];
                const invitedAll = [...invitedSummaries.map(s => ({ type: 'session', data: s })), ...invitedLinked.map(ls => ({ type: 'linked', data: ls }))];
                const sorted = [...ownAll, ...invitedAll];

                return sorted.map((item, idx) => {
                  const isOwn = item.data.createdBy === currentUserId;
                  if (item.type === 'session') {
                    return <SessionCard key={item.data.sessionId} summary={item.data} index={idx} onSessionClick={loadSessionDetail} isOwnTable={isOwn} />;
                  }
                  return <LinkedSessionCard key={item.data.sessionId} session={item.data} index={idx} onClick={() => loadSessionDetail(item.data.sessionId)} isOwnTable={isOwn} />;
                });
              })()}
            </div>
          );
        })()}
      </section>

      {/* ── Game Matrix ── */}
      <ProfileGameMatrix rounds={declarerRounds} />
    </div>
  );
};

export default MeinProfil;
