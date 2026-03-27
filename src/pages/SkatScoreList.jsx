import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS } from '../lib/skatScoring';
import GameTypeEditor from '../components/GameTypeEditor';

const SkatScoreList = () => {
  const navigate = useNavigate();
  const { rounds, players, getPlayerTotals, getSeegerTotals, getPlayerRank } = useGame();

  const standardTotals = getPlayerTotals();
  const seegerTotals = getSeegerTotals();
  const standardRank = getPlayerRank(false);
  const seegerRank = getPlayerRank(true);

  const VISIBLE_TAIL = 5;
  const [expanded, setExpanded] = useState(false);
  const [editingRound, setEditingRound] = useState(null);

  // Precompute running totals for every round index once
  const runningStd = [];
  const runningSF  = [];
  rounds.forEach((r, idx) => {
    const std = idx === 0 ? {} : { ...runningStd[idx - 1] };
    const sf  = idx === 0 ? {} : { ...runningSF[idx - 1] };
    players.forEach(p => { if (std[p] === undefined) std[p] = 0; if (sf[p] === undefined) sf[p] = 0; });
    std[r.player] = (std[r.player] || 0) + r.gameValue;
    if (r.seegerScores) players.forEach(p => { sf[p] = (sf[p] || 0) + (r.seegerScores[p] || 0); });
    runningStd.push(std);
    runningSF.push(sf);
  });

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

      {/* ── Doppelte Wertungsübersicht ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
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
      </div>

      {/* ── Spielverlauf ── */}
      <h3 className="headline" style={{ fontSize: '1.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        Spielverlauf
        {(() => {
          const importCount = rounds.filter(r => !r.gameType || !['club','spade','heart','diamond','grand','null'].includes(r.gameType)).length;
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
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {/* ── Older rounds (collapsible) ── */}
              {olderRounds.length > 0 && (
                <>
                  {expanded && olderRounds.map((r, idx) => (
                    <RoundRow key={r.id} r={r} idx={idx} players={players}
                      std={runningStd[idx]} sf={runningSF[idx]} onEdit={setEditingRound} />
                  ))}
                  {/* Toggle row */}
                  <tr style={{ backgroundColor: 'var(--surface-high)' }}>
                    <td colSpan={4 + players.length * 2 + 2}
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
                    std={runningStd[idx]} sf={runningSF[idx]} onEdit={setEditingRound} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sitzungsstatistik ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '3rem' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Runden gesamt</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Gewonnen</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.filter(r => r.won).length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>Verloren</p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{rounds.filter(r => !r.won).length}</p>
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
  club:    { symbol: '♣', label: 'Kreuz' },
  spade:   { symbol: '♠', label: 'Pik' },
  heart:   { symbol: '♥', label: 'Herz' },
  diamond: { symbol: '♦', label: 'Karo' },
  grand:   { symbol: '👑', label: 'Grand' },
  null:    { symbol: 'N', label: 'Null' },
};

function GameTypeIcon({ round }) {
  const gt = round.gameType;
  const display = GAME_TYPE_DISPLAY[gt];

  if (!display) {
    // Unknown / Import
    return (
      <span title={round.typeLabel} style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '1.6rem', height: '1.6rem', borderRadius: '0.3rem',
        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.02em',
        backgroundColor: 'var(--surface-high)', color: 'var(--outline)',
        verticalAlign: 'middle',
      }}>
        ?
      </span>
    );
  }

  const suffixes = [];
  if (round.hand)   suffixes.push('H');
  if (round.ouvert) suffixes.push('O');

  return (
    <span title={round.typeLabel} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
      verticalAlign: 'middle',
    }}>
      <span style={{ fontSize: gt === 'grand' ? '1rem' : '1.1rem', lineHeight: 1 }}>
        {display.symbol}
      </span>
      {suffixes.length > 0 && (
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--outline)', lineHeight: 1 }}>
          {suffixes.join('')}
        </span>
      )}
    </span>
  );
}
const RoundRow = ({ r, idx, players, std, sf, onEdit }) => (
  <tr style={{ borderBottom: '1px solid var(--surface-high)', backgroundColor: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface-low)' }}>
    <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--outline)' }}>{r.id}</td>
    <td style={{ ...tdStyle, fontWeight: 600 }}>{r.player}</td>
    <td style={{ ...tdStyle, color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>
      <GameTypeIcon round={r} />
      <button
        aria-label={`Runde ${r.id} bearbeiten`}
        onClick={() => onEdit(r)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 0.4rem', verticalAlign: 'middle', color: 'var(--outline)', lineHeight: 1 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
      </button>
    </td>
    <td style={{ ...tdStyle, fontWeight: 800, textAlign: 'right', color: r.gameValue >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
      {r.gameValue >= 0 ? '+' : ''}{r.gameValue}
    </td>
    <td style={tdDivider}></td>
    {players.map(p => (
      <td key={`std-${p}`} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, opacity: r.player === p ? 1 : 0.4, color: (std[p] ?? 0) >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
        {std[p] ?? 0}
      </td>
    ))}
    <td style={tdDivider}></td>
    {players.map(p => (
      <td key={`sf-${p}`} style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, opacity: (r.seegerScores?.[p] || 0) !== 0 ? 1 : 0.4, color: (sf[p] ?? 0) >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
        {sf[p] ?? 0}
      </td>
    ))}
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
