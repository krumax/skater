import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { computeListStats, computeListProgress } from '../lib/spiellistenUtils';
import { PLAYER_COLORS } from '../lib/tokens';

const SpiellistenPage = () => {
  const { spiellisten, rounds, players, closeSpielliste } = useGame();
  const [selectedId, setSelectedId] = useState(null);

  const selectedListe = spiellisten.find(l => l.id === selectedId) ?? null;
  const listRounds = selectedListe
    ? rounds.filter(r => r.spiellisteId === selectedId)
    : [];
  const stats = selectedListe ? computeListStats(players, listRounds) : null;
  const progress = selectedListe ? computeListProgress(selectedListe, listRounds) : null;

  const handleClose = async (id) => {
    await closeSpielliste(id);
  };

  const statusLabel = (status) => status === 'aktiv' ? 'Aktiv' : 'Abgeschlossen';
  const statusColor = (status) => status === 'aktiv' ? 'var(--primary)' : 'var(--outline)';

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Spiellisten</h1>
        <p className="page-subtitle">Übersicht aller Listen dieses Tisches.</p>
      </header>

      {spiellisten.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block', opacity: 0.4 }}>
            format_list_numbered
          </span>
          <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>Noch keine Listen vorhanden.</p>
          <p style={{ marginTop: '0.5rem' }}>Erstelle eine Liste in der Ansicht „Aktuelle Runde".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedListe ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}
             className="spiellisten-grid">

          {/* List overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {spiellisten.map((liste, idx) => {
              const lRounds = rounds.filter(r => r.spiellisteId === liste.id);
              const lProgress = computeListProgress(liste, lRounds);
              const isSelected = liste.id === selectedId;

              return (
                <div
                  key={liste.id}
                  className="card"
                  onClick={() => setSelectedId(isSelected ? null : liste.id)}
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: PLAYER_COLORS[idx % PLAYER_COLORS.length] }}>
                        {idx + 1}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--on-surface)' }}>
                          {liste.name}
                        </p>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                          borderRadius: '0.25rem', backgroundColor: statusColor(liste.status) + '22',
                          color: statusColor(liste.status),
                        }}>
                          {statusLabel(liste.status)}
                        </span>
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
                        <div style={{
                          height: '100%',
                          width: `${Math.min((lProgress.current / lProgress.total) * 100, 100)}%`,
                          backgroundColor: 'var(--primary)', borderRadius: '3px',
                        }} />
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

          {/* Drill-down stats */}
          {selectedListe && stats && (
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{selectedListe.name}</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--outline)' }}>
                    {stats.playedRounds} von {selectedListe.roundCount} Runden gespielt
                  </p>
                </div>
                {selectedListe.status === 'aktiv' && (
                  <button
                    onClick={() => handleClose(selectedListe.id)}
                    className="chip"
                    style={{ color: 'var(--secondary)', borderColor: 'var(--secondary)', flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '0.25rem' }}>
                      stop_circle
                    </span>
                    Abschließen
                  </button>
                )}
              </div>

              {/* Progress bar for active list */}
              {progress && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--outline)', marginBottom: '0.3rem' }}>
                    <span>Fortschritt</span>
                    <span>Runde {progress.current} von {progress.total}</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--outline-variant)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((progress.current / progress.total) * 100, 100)}%`,
                      backgroundColor: 'var(--primary)', borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Player stats table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.sortedPlayers.map((p, rank) => {
                  const isWinner = selectedListe.status === 'abgeschlossen' && selectedListe.winner?.includes(p.name);
                  return (
                    <div
                      key={p.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
                        backgroundColor: isWinner ? 'rgba(208,166,0,0.12)' : 'var(--surface-low)',
                        border: isWinner ? '1px solid rgba(208,166,0,0.4)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--outline)', width: '1.25rem', textAlign: 'center', flexShrink: 0 }}>
                        {rank + 1}.
                      </span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>
                        {isWinner && '🏆 '}{p.name}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.9375rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: (p.seeger + p.raw) >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
                          {(p.seeger + p.raw) >= 0 ? '+' : ''}{p.seeger + p.raw}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>
                          Gesamt
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '60px' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", color: p.raw >= 0 ? 'var(--on-surface)' : 'var(--secondary)' }}>
                          {p.raw >= 0 ? '+' : ''}{p.raw}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>
                          Rohpunkte
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpiellistenPage;
