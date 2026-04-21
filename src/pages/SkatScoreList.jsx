import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { SUIT_LABELS } from '../lib/skatScoring';
import GameTypeEditor from '../components/GameTypeEditor';
import SuitBadge from '../components/SuitBadge';
import { computeRunningTotals } from '../lib/playerStats';
import { PLAYER_COLORS } from '../lib/tokens';
import { computeListStats, computeListProgress } from '../lib/spiellistenUtils';

const SkatScoreList = () => {
  const navigate = useNavigate();
  const { rounds, players: allPlayers, getPlayerTotals, getSeegerTotals, getPlayerRank, deleteRound, sessionLoaded, spiellisten, closeSpielliste } = useGame();
  const players = allPlayers.filter(p => p !== '-');

  const standardTotals = getPlayerTotals();
  const seegerTotals = getSeegerTotals();
  const standardRank = getPlayerRank(false).filter(e => e.name !== '-');
  const seegerRank = getPlayerRank(true).filter(e => e.name !== '-');

  const VISIBLE_TAIL = 6;
  const [expanded, setExpanded] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [activeTab, setActiveTab] = useState('liste'); // 'liste' | 'spiellisten'
  const [selectedSpiellisteId, setSelectedSpiellisteId] = useState(null);

  // Running totals per round - memoized, pure function
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

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '2px solid var(--outline-variant)', paddingBottom: '0' }}>
        <button
          onClick={() => setActiveTab('liste')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem',
            fontFamily: 'inherit', color: activeTab === 'liste' ? 'var(--primary)' : 'var(--outline)',
            borderBottom: activeTab === 'liste' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'color 0.15s',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>table_rows</span>
          Skatliste
        </button>
        <button
          onClick={() => setActiveTab('spiellisten')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem',
            fontFamily: 'inherit', color: activeTab === 'spiellisten' ? 'var(--primary)' : 'var(--outline)',
            borderBottom: activeTab === 'spiellisten' ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px', transition: 'color 0.15s',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>format_list_numbered</span>
          Spielserien
          {spiellisten.length > 0 && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 800, minWidth: '1.25rem', height: '1.25rem',
              borderRadius: '999px', backgroundColor: activeTab === 'spiellisten' ? 'var(--primary)' : 'var(--outline)',
              color: 'var(--on-primary, #fff)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 0.3rem',
            }}>{spiellisten.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'liste' && (
        <>
          {/* ── Sitzungsstatistik ── */}
      <div className="stats-grid-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem', gridAutoRows: 'auto' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
          <p className="stat-label">Runden gesamt</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
          <p className="stat-label">Gewonnen</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{rounds.filter(r => r.won && r.gameType !== 'passed').length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
          <p className="stat-label">Verloren</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--secondary)' }}>{rounds.filter(r => !r.won && r.gameType !== 'passed').length}</p>
        </div>
        <div className="card" style={{ textAlign: 'center', backgroundColor: 'var(--surface-low)', padding: '0.75rem 1rem' }}>
          <p className="stat-label">Eingepasst</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--outline)' }}>{rounds.filter(r => r.gameType === 'passed').length}</p>
        </div>
      </div>

      {/* ── Dreifache Wertungsübersicht ── */}
      <div className="ranking-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '3rem' }}>
        {/* Standard */}
        <div className="card ranking-card ranking-card-compact" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>calculate</span>
            Standardwertung
          </h3>
          <div className="ranking-rows" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {standardRank.map((entry) => (
              <RankingRow key={entry.name} rank={entry.rank} name={entry.name} score={entry.score} />
            ))}
          </div>
        </div>

        {/* Seeger-Fabian */}
        <div className="card ranking-card-compact" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>trophy</span>
            Seeger-Fabian
          </h3>
          <div className="ranking-rows" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {seegerRank.map((entry) => (
              <RankingRow key={entry.name} rank={entry.rank} name={entry.name} score={entry.score} />
            ))}
          </div>
        </div>

        {/* Kombiniert */}
        <div className="card ranking-card-compact" style={{ backgroundColor: 'var(--surface-low)' }}>
          <h3 className="headline" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>merge</span>
            Kombiniert
          </h3>
          <div className="ranking-rows" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(() => {
              const combined = players
                .filter(p => p !== '-')
                .map(p => ({ name: p, score: (standardTotals[p] ?? 0) + (seegerTotals[p] ?? 0) }))
                .sort((a, b) => b.score - a.score)
                .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
              return combined.map((entry) => (
                <RankingRow key={entry.name} rank={entry.rank} name={entry.name} score={entry.score} />
              ));
            })()}
          </div>
        </div>
      </div>

      {/* ── Spielverlauf ── */}
      {(() => {
        const importCount = rounds.filter(r => !r.gameType || !['club','spade','heart','diamond','grand','null','passed'].includes(r.gameType)).length;
        return importCount > 0 ? (
          <div style={{ marginBottom: '1rem' }}>
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
          </div>
        ) : null;
      })()}

      {rounds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>playing_cards</span>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Runden gespielt.</p>
          <p>Starte ein neues Spiel über die Seitenleiste.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table className="mobile-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--outline-variant)' }}>
                <th className="col-round-nr" style={thStyle}>#</th>
                <th style={thStyle}>Spieler</th>
                <th className="col-type" style={thStyle}>Typ</th>
                <th className="col-ansage" style={{ ...thStyle, textAlign: 'right' }}>Ansage</th>
                <th className="col-modifier" style={{ ...thStyle, textAlign: 'left', paddingLeft: '0.25rem', color: 'var(--outline)', fontSize: '0.6rem' }}>Mod.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Pkt.</th>
                <th className="score-col-divider" style={thDivider}></th>
                {players.map(p => (
                  <th key={`std-${p}`} className="score-col-std score-col-std-mobile" style={{ ...thStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--outline)' }}>STD</span>
                    {p}
                  </th>
                ))}
                <th className="score-col-divider" style={thDivider}></th>
                {players.map(p => (
                  <th key={`sf-${p}`} className="score-col-sf" style={{ ...thStyle, textAlign: 'right' }}>
                    <span style={{ fontSize: '0.6rem', display: 'block', color: 'var(--tertiary)' }}>S-F</span>
                    {p}
                  </th>
                ))}
                <th className="col-actions" style={{ ...thStyle, width: '2.5rem' }}></th>
              </tr>
            </thead>
            <tbody style={{ fontFamily: 'Work Sans, sans-serif' }}>
              {/* ── Older rounds (collapsible) ── */}
              {olderRounds.length > 0 && (
                <>
                  {expanded && olderRounds.map((r, idx) => (
                    <RoundRow key={r._dbId ?? `old-${idx}`} r={r} idx={idx} players={players}
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
                  <RoundRow key={r._dbId ?? `recent-${i}`} r={r} idx={idx} players={players}
                    std={runningStd[idx]} sf={runningSF[idx]}
                    sfPrev={idx > 0 ? runningSF[idx - 1] : null}
                    onEdit={setEditingRound} onDelete={deleteRound} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── GameTypeEditor Modal ── */}
      {editingRound !== null && (
        <GameTypeEditor
          round={editingRound}
          onClose={() => setEditingRound(null)}
          onSaved={() => setEditingRound(null)}
        />
      )}
        </>
      )}

      {activeTab === 'spiellisten' && (
        <SpiellistenTab
          spiellisten={spiellisten}
          rounds={rounds}
          players={players}
          closeSpielliste={closeSpielliste}
          selectedSpiellisteId={selectedSpiellisteId}
          setSelectedSpiellisteId={setSelectedSpiellisteId}
        />
      )}
    </div>
  );
};

// ── SpiellistenTab ───────────────────────────────────────────────────────────
function SpiellistenTab({ spiellisten, rounds, players, closeSpielliste, selectedSpiellisteId, setSelectedSpiellisteId }) {
  const statusLabel = (s) => s === 'aktiv' ? 'Aktiv' : 'Abgeschlossen';
  const statusColor = (s) => s === 'aktiv' ? 'var(--primary)' : 'var(--outline)';

  if (spiellisten.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.4 }}>format_list_numbered</span>
        <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Spielserien vorhanden.</p>
        <p style={{ marginTop: '0.5rem' }}>Erstelle eine Spielserie über die Einstellungen.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {spiellisten.map((liste, idx) => {
        const lRounds = rounds.filter(r => r.spiellisteId === liste.id);
        const lProgress = computeListProgress(liste, lRounds);
        const isSelected = liste.id === selectedSpiellisteId;
        const lStats = isSelected ? computeListStats(players, lRounds) : null;

        return (
          <div key={liste.id} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Row */}
            <div
              className="card"
              onClick={() => setSelectedSpiellisteId(isSelected ? null : liste.id)}
              style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                backgroundColor: 'var(--surface-low)',
                transition: 'border-color 0.15s',
                borderRadius: isSelected ? '0.75rem 0.75rem 0 0' : '0.75rem',
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

            {/* Inline drill-down */}
            {isSelected && lStats && (
              <div style={{
                border: '2px solid var(--primary)', borderTop: 'none',
                borderRadius: '0 0 0.75rem 0.75rem',
                backgroundColor: 'var(--surface)',
                padding: '1rem 1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
                    {lStats.playedRounds} von {liste.roundCount} Runden gespielt
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {lProgress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '80px', height: '5px', backgroundColor: 'var(--outline-variant)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min((lProgress.current / lProgress.total) * 100, 100)}%`, backgroundColor: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>{lProgress.current}/{lProgress.total}</span>
                      </div>
                    )}
                    {liste.status === 'aktiv' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); closeSpielliste(liste.id); }}
                        className="chip"
                        style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)', flexShrink: 0, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>stop_circle</span>
                        Abschließen
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {lStats.sortedPlayers.map((p, rank) => {
                    const isWinner = liste.status === 'abgeschlossen' && liste.winner?.includes(p.name);
                    return (
                      <div key={p.name} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                        backgroundColor: isWinner ? 'rgba(208,166,0,0.12)' : 'var(--surface-low)',
                        border: isWinner ? '1px solid rgba(208,166,0,0.4)' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--outline)', width: '1.25rem', textAlign: 'center', flexShrink: 0 }}>{rank + 1}.</span>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>{isWinner && '🏆 '}{p.name}</span>
                        <div style={{ textAlign: 'right', minWidth: '60px' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", color: p.raw >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
                            {p.raw >= 0 ? '+' : ''}{p.raw}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--outline)' }}>Rohpunkte</p>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '60px' }}>
                          <p style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: (p.seeger + p.raw) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                            {(p.seeger + p.raw) >= 0 ? '+' : ''}{p.seeger + p.raw}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--outline)' }}>Gesamt</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── RankingRow ───────────────────────────────────────────────────────────────
function RankingRow({ rank, name, score }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="ranking-badge" style={{
          width: '28px', height: '28px', borderRadius: '50%',
          backgroundColor: rank === 1 ? 'var(--tertiary-container)' : 'var(--surface-high)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 800, flexShrink: 0,
        }}>{rank}</span>
        <span className="ranking-name" style={{ fontWeight: 600 }}>{name}</span>
      </div>
      <span className="ranking-score" style={{
        fontWeight: 800, fontSize: '1.5rem',
        fontFamily: "'Manrope', sans-serif",
        color: score >= 0 ? 'var(--primary)' : 'var(--secondary)',
      }}>
        {score >= 0 ? `+${score}` : `${score}`}
      </span>
    </div>
  );
}

const RoundRow = ({ r, idx, players, std, sf, sfPrev, onEdit, onDelete }) => (
  <tr style={{ borderBottom: '1px solid var(--surface-high)', backgroundColor: idx % 2 === 0 ? 'var(--bg)' : 'var(--surface-low)' }}>
    <td className="col-round-nr" style={{ ...tdStyle, fontWeight: 800, color: 'var(--outline)' }}>{r.id}</td>
    <td style={{ ...tdStyle, fontWeight: 600, color: r.won ? 'var(--on-surface)' : 'var(--secondary)' }}>{r.player}</td>
    <td className="col-type" style={{ ...tdStyle, color: r.won ? 'var(--on-surface-variant)' : 'var(--secondary)' }}>
      <SuitBadge gameType={r.gameType} size="md" />
    </td>
    <td className="col-ansage" style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--on-surface-variant)', fontFamily: "'Manrope', sans-serif", paddingRight: '0.25rem' }}>
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
    <td className="col-modifier" style={{ ...tdStyle, paddingLeft: '0.25rem', paddingRight: '0.5rem' }}>
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
        <span className="badge-bock" style={{
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
    <td style={tdDivider} className="score-col-divider"></td>
    {players.map(p => (
      <td key={`std-${p}`} className="score-col-std score-col-std-mobile" style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, opacity: r.player === p ? 1 : 0.4, color: (std[p] ?? 0) >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
        {std[p] ?? 0}
      </td>
    ))}
    <td style={tdDivider} className="score-col-divider"></td>
    {players.map(p => {
      const prev = sfPrev?.[p] ?? 0;
      const curr = sf[p] ?? 0;
      const delta = curr - prev;
      const color = delta < 0 ? 'var(--secondary)' : 'var(--on-surface)';
      return (
        <td key={`sf-${p}`} className="score-col-sf" style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, opacity: delta !== 0 ? 1 : 0.4, color }}>
          {curr}
        </td>
      );
    })}
    <td className="col-actions" style={{ ...tdStyle, textAlign: 'center', padding: '0.75rem 0.5rem', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
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
