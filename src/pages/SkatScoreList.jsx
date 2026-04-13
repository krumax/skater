import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS } from '../lib/skatScoring';
import GameTypeEditor from '../components/GameTypeEditor';
import { computeRunningTotals } from '../lib/playerStats';

const SkatScoreList = () => {
  const navigate = useNavigate();
  const { rounds, players: allPlayers, getPlayerTotals, getSeegerTotals, getPlayerRank, deleteRound, sessionLoaded } = useGame();
  const players = allPlayers.filter(p => p !== '-');

  const standardTotals = getPlayerTotals();
  const seegerTotals = getSeegerTotals();
  const standardRank = getPlayerRank(false).filter(e => e.name !== '-');
  const seegerRank = getPlayerRank(true).filter(e => e.name !== '-');

  const VISIBLE_TAIL = 5;
  const [expanded, setExpanded] = useState(false);
  const [editingRound, setEditingRound] = useState(null);

  // Running totals per round — memoized, pure function
  const { runningStd, runningSF } = useMemo(
    () => computeRunningTotals(players, rounds),
    [players, rounds]
  );

  const splitAt = Math.max(0, rounds.length - VISIBLE_TAIL);
  const olderRounds = rounds.slice(0, splitAt);
  const recentRounds = rounds.slice(splitAt);

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Skatliste</h1>
          <p className="page-subtitle">{rounds.length} Runden gespielt</p>
        </div>
      </header>

      {/* ── Dreifache Wertungsübersicht ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        {/* Standard */}
        <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>calculate</span>
            Standardwertung
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {standardRank.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: idx === 0 ? 'var(--tertiary-container)' : 'var(--surface-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800,
                  }}>{entry.rank}</span>
                  <span style={{ fontWeight: 600 }}>{entry.name}</span>
                </div>
                <span style={{
                  fontWeight: 800, fontSize: '1.5rem',
                  fontFamily: "'Manrope', sans-serif",
                  color: entry.score >= 0 ? 'var(--primary)' : 'var(--secondary)',
                }}>
                  {entry.score >= 0 ? '+' : ''}{entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Seeger-Fabian */}
        <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>trophy</span>
            Seeger-Fabian
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {seegerRank.map((entry, idx) => (
              <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: idx === 0 ? 'var(--tertiary-container)' : 'var(--surface-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 800,
                  }}>{entry.rank}</span>
                  <span style={{ fontWeight: 600 }}>{entry.name}</span>
                </div>
                <span style={{
                  fontWeight: 800, fontSize: '1.5rem',
                  fontFamily: "'Manrope', sans-serif",
                  color: entry.score >= 0 ? 'var(--primary)' : 'var(--secondary)',
                }}>
                  {entry.score >= 0 ? '+' : ''}{entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kombiniert */}
        <div className="card" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>merge</span>
            Kombiniert
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(() => {
              const combined = players
                .filter(p => p !== '-')
                .map(p => ({ name: p, score: (standardTotals[p] ?? 0) + (seegerTotals[p] ?? 0) }))
                .sort((a, b) => b.score - a.score)
                .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
              return combined.map((entry, idx) => (
                <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: idx === 0 ? 'var(--tertiary-container)' : 'var(--surface-high)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 800,
                    }}>{entry.rank}</span>
                    <span style={{ fontWeight: 600 }}>{entry.name}</span>
                  </div>
                  <span style={{
                    fontWeight: 800, fontSize: '1.5rem',
                    fontFamily: "'Manrope', sans-serif",
                    color: entry.score >= 0 ? 'var(--primary)' : 'var(--secondary)',
                  }}>
                    {entry.score >= 0 ? '+' : ''}{entry.score}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* ── Spielverlauf ── */}
      <h3 className="headline" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        Spielverlauf
        {(() => {
          const importCount = rounds.filter(r => !r.gameType || !['club','spade','heart','diamond','grand','null','passed'].includes(r.gameType)).length;
          return importCount > 0 ? (
            <span title={`${importCount} Spiele noch ohne Spieltyp`} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.8rem', fontWeight: 700,
              backgroundColor: 'var(--secondary-container, #f97316)',
              color: 'var(--on-secondary-container, #fff)',
              padding: '0.2rem 0.6rem', borderRadius: '999px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>pending</span>
              {importCount} Import
            </span>
          ) : null;
        })()}
      </h3>

      {rounds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>playing_cards</span>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Runden gespielt.</p>
          <p>Starte ein neues Spiel über die Seitenleiste.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--outline-variant)' }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Spieler</th>
                <th style={thStyle}>Typ</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Ansage</th>
                <th style={{ ...thStyle, textAlign: 'left', paddingLeft: '0.25rem', color: 'var(--outline)', fontSize: '0.6rem' }}>Mod.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Spielwert</th>
                <th style={thDivider}></th>
                {players.map(p => (
                  <th key={`std-${p}`} style={{ ...thStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--outline)' }}>STD</span>
                    {p}
                  </th>
                ))}
                <th style={thDivider}></th>
                {players.map(p => (
                  <th key={`sf-${p}`} style={{ ...thStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--tertiary)' }}>S-F</span>
                    {p}
                  </th>
                ))}
                <th style={{ ...thStyle, width: '2.5rem' }}></th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {/* ── Older rounds (collapsible) ── */}
              {olderRounds.length > 0 && (
                <>
                  {expanded && olderRounds.map((r, idx) => (
                    <RoundRow key={r.id} r={r} idx={idx} players={players}
                      std={runningStd[idx]} sf={runningSF[idx]}
                      sfPrev={idx > 0 ? runningSF[idx - 1] : null}
                      onEdit={setEditingRound} onDelete={deleteRound} />
                  ))}
                  {/* Toggle row */}
                  <tr style={{ backgroundColor: 'var(--surface-high)' }}>
                    <td colSpan={6 + players.length * 2 + 2}
                      style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
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
              {/* ── Last 5 rounds (always visible) ── */}
              {recentRounds.map((r, i) => {
                const idx = splitAt + i;
                return (
                  <RoundRow key={r.id} r={r} idx={idx} players={players}
                    std={runningStd[idx]} sf={runningSF[idx]}
                    sfPrev={idx > 0 ? runningSF[idx - 1] : null}
                    onEdit={setEditingRound} onDelete={deleteRound} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sitzungsstatistik ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', marginTop: '3rem' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Runden gesamt</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Gewonnen</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.filter(r => r.won && r.gameType !== 'passed').length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Verloren</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{rounds.filter(r => !r.won && r.gameType !== 'passed').length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Eingepasst</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--outline)' }}>{rounds.filter(r => r.gameType === 'passed').length}</p>
        </div>
      </div>

      {/* ── GameTypeEditor Modal ── */}
      {editingRound !== null && (
        <GameTypeEditor
          round={editingRound}
          onClose={() => setEditingRound(null)}
          onSaved={() => setEditingRound(null)}
        />
      )}
    </div>
  );
};

// ── Game type icon/badge ─────────────────────────────────────────────────────
const GAME_TYPE_DISPLAY = {
  grand:   { symbol: null, matIcon: 'stars',    label: 'Grand',  bg: '#0b3d2e', color: '#fff' },
  club:    { symbol: '♣',  matIcon: null,        label: 'Kreuz',  bg: '#1b1c1c', color: '#fff' },
  spade:   { symbol: '♠',  matIcon: null,        label: 'Pik',    bg: '#414944', color: '#fff' },
  heart:   { symbol: '♥',  matIcon: null,        label: 'Herz',   bg: '#b52619', color: '#fff' },
  diamond: { symbol: '♦',  matIcon: null,        label: 'Karo',   bg: '#d0a600', color: '#1b1c1c' },
  null:    { symbol: null, matIcon: 'block',     label: 'Null',   bg: '#717974', color: '#fff' },
  passed:  { symbol: null, matIcon: 'skip_next', label: 'Passen', bg: '#c0c0d0', color: '#555' },
};

function GameTypeIcon({ round }) {
  const gt = round.gameType;
  const display = GAME_TYPE_DISPLAY[gt];

  const bg = display?.bg ?? 'var(--surface-high)';
  const color = display?.color ?? 'var(--outline)';

  return (
    <span title={round.typeLabel} style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '2rem', height: '2rem', borderRadius: '0.4rem',
        backgroundColor: bg, flexShrink: 0,
      }}>
        {!display
          ? <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--outline)' }}>?</span>
          : display.symbol
            ? <span style={{ fontSize: '1rem', fontWeight: 700, color, lineHeight: 1 }}>{display.symbol}</span>
            : <span className="material-symbols-outlined" style={{ fontSize: '1rem', color, lineHeight: 1 }}>{display.matIcon}</span>
        }
      </span>
    </span>
  );
}
const RoundRow = ({ r, idx, players, std, sf, sfPrev, onEdit, onDelete }) => (
  <tr style={{ borderBottom: '1px solid var(--surface-high)', backgroundColor: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface-low)' }}>
    <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--outline)' }}>{r.id}</td>
    <td style={{ ...tdStyle, fontWeight: 600, color: r.won ? 'var(--on-surface)' : 'var(--secondary)' }}>{r.player}</td>
    <td style={{ ...tdStyle, color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>
      <GameTypeIcon round={r} />
    </td>
    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--on-surface-variant)', fontFamily: "'Manrope', sans-serif", paddingRight: '0.25rem' }}>
      {(() => {
        const isNull   = r.gameType === 'null';
        const isPassed = r.gameType === 'passed';
        if (isPassed) return <span style={{ color: 'var(--outline)', opacity: 0.4 }}>—</span>;
        if (isNull)   return <span style={{ color: 'var(--outline)', opacity: 0.6 }}>—</span>;
        return r.spitzen != null
          ? <span style={{ color: 'var(--on-surface)' }}>
              {(r.mitOhne ?? 'mit') === 'ohne' ? '−' : '+'}{r.spitzen}
            </span>
          : <span style={{ color: 'var(--outline)', opacity: 0.4 }}>—</span>;
      })()}
    </td>
    <td style={{ ...tdStyle, paddingLeft: '0.25rem', paddingRight: '0.5rem' }}>
      {(() => {
        const badges = [];
        if (r.hand)      badges.push('H');
        if (r.schneider) badges.push('S');
        if (r.schwarz)   badges.push('Sz');
        if (r.ouvert)    badges.push('O');
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
    <td style={{ ...tdStyle, fontWeight: 800, textAlign: 'right', color: r.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
      {r.isBock === true && (
        <span style={{
          display: 'inline-block',
          fontSize: '0.6rem',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          backgroundColor: 'var(--tertiary-container)',
          color: 'var(--on-tertiary-container, #fff)',
          padding: '0.1rem 0.35rem',
          borderRadius: '0.25rem',
          marginRight: '0.4rem',
          verticalAlign: 'middle',
        }}>Bock</span>
      )}
      {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
    </td>
    <td style={tdDivider}></td>
    {players.map(p => (
      <td key={`std-${p}`} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, opacity: r.player === p ? 1 : 0.4, color: (std[p] ?? 0) >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
        {std[p] ?? 0}
      </td>
    ))}
    <td style={tdDivider}></td>
    {players.map(p => {
      const prev = sfPrev?.[p] ?? 0;
      const curr = sf[p] ?? 0;
      const delta = curr - prev;
      const color = delta < 0 ? 'var(--secondary)' : 'var(--on-surface)';
      return (
        <td key={`sf-${p}`} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, opacity: delta !== 0 ? 1 : 0.4, color }}>
          {curr}
        </td>
      );
    })}
    <td style={{ ...tdStyle, textAlign: 'center', padding: '0.75rem 0.5rem', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
      <button
        aria-label={`Runde ${r.id} bearbeiten`}
        onClick={() => onEdit(r)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', verticalAlign: 'middle', color: 'var(--outline)', lineHeight: 1, borderRadius: '0.25rem' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
      </button>
      <button
        aria-label={`Runde ${r.id} löschen`}
        onClick={() => {
          if (window.confirm('Bist du sicher, dass du diese Runde wirklich löschen möchtest?')) {
            onDelete(r);
          }
        }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', verticalAlign: 'middle', color: 'var(--secondary)', lineHeight: 1, borderRadius: '0.25rem' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
      </button>
    </td>
  </tr>
);

const thStyle = {  padding: '0.75rem 1rem',
  textTransform: 'uppercase',
  fontSize: '0.7rem',
  color: 'var(--outline)',
  letterSpacing: '0.08em',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};
const thDivider = {
  width: '1px',
  padding: 0,
  backgroundColor: 'var(--outline-variant)',
};
const tdStyle = { padding: '0.75rem 1rem', whiteSpace: 'nowrap' };
const tdDivider = { width: '1px', padding: 0, backgroundColor: 'var(--surface-high)' };

export default SkatScoreList;
