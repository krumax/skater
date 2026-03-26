import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';

// Position 0 = Geber, 1 = Hören, 2 = Sagen, 3 = Aussetzt (4-player only)
const ROLE_LABELS = ['Geben', 'Hören', 'Sagen', 'Aussetzt'];
const ROLE_ICONS  = ['style', 'hearing', 'record_voice_over', 'pause_circle'];

// Single accent color per role — kept minimal
const ROLE_COLORS = [
  'var(--primary)',   // Geben
  'var(--tertiary)',  // Hören
  '#e67e22',         // Sagen
  'var(--outline)',   // Aussetzt
];

function roleIndex(position, totalPlayers) {
  // With 4 players: seat 0 = Aussetzt, seat 1 = Geben, seat 2 = Hören, seat 3 = Sagen
  // With 3 players: seat 0 = Geben,    seat 1 = Hören,  seat 2 = Sagen
  if (totalPlayers === 4) {
    return [3, 0, 1, 2][position]; // maps list position → role index
  }
  return position; // 0→Geben, 1→Hören, 2→Sagen
}

// ── Read-only round table SVG ────────────────────────────────────────────────
function RoundTable({ seating }) {
  const n = seating.length;
  const cx = 140, cy = 140, r = 95;

  function pos(i) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  return (
    <svg viewBox="0 0 280 280" width="280" height="280" style={{ display: 'block', margin: '0 auto' }}>
      {/* Table */}
      <circle cx={cx} cy={cy} r={58} fill="var(--surface-high)" stroke="var(--outline-variant)" strokeWidth="1.5" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fill="var(--outline)" fontFamily="inherit" fontWeight="700" letterSpacing="0.1em">
        TISCH
      </text>

      {/* Spokes */}
      {seating.map((_, i) => {
        const p = pos(i);
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        return (
          <line key={i}
            x1={cx + 60 * Math.cos(angle)} y1={cy + 60 * Math.sin(angle)}
            x2={p.x} y2={p.y}
            stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="3 3"
          />
        );
      })}

      {/* Seats */}
      {seating.map((name, i) => {
        const p = pos(i);
        const ri = roleIndex(i, n);
        const color = ROLE_COLORS[ri];
        const label = ROLE_LABELS[ri];
        return (
          <g key={name}>
            <circle cx={p.x} cy={p.y} r={26} fill="var(--surface-low)" stroke={color} strokeWidth="2" />
            <text x={p.x} y={p.y - 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="14" fontWeight="800" fill={color} fontFamily="inherit">
              {name.charAt(0).toUpperCase()}
            </text>
            <text x={p.x} y={p.y + 9} textAnchor="middle"
              fontSize="8.5" fontWeight="600" fill={color} fontFamily="inherit">
              {name.length > 7 ? name.slice(0, 6) + '…' : name}
            </text>
            {/* Role pill below seat */}
            <rect x={p.x - 18} y={p.y + 28} width={36} height={13} rx={6.5} fill={color} opacity="0.85" />
            <text x={p.x} y={p.y + 34.5} textAnchor="middle" dominantBaseline="middle"
              fontSize="7.5" fontWeight="800" fill="white" fontFamily="inherit" letterSpacing="0.04em">
              {label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PlayerSettings() {
  const { players, addPlayer, removePlayer, renamePlayer, reorderSeating, rounds } = useGame();

  const [newName, setNewName]         = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editName, setEditName]       = useState('');

  // Drag state
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // ── Drag handlers ──
  const onDragStart = (i) => { dragIndex.current = i; };
  const onDragEnter = (i) => { if (i !== dragIndex.current) setDragOver(i); };
  const onDragEnd   = ()  => { setDragOver(null); dragIndex.current = null; };
  const onDrop      = (i) => {
    if (dragIndex.current !== null && dragIndex.current !== i) {
      reorderSeating(dragIndex.current, i);
    }
    setDragOver(null);
    dragIndex.current = null;
  };

  // ── Player actions ──
  const handleAdd = () => {
    const t = newName.trim();
    if (t && !players.includes(t)) { addPlayer(t); setNewName(''); }
  };

  const handleRename = (oldName) => {
    const t = editName.trim();
    if (t && t !== oldName && !players.includes(t)) renamePlayer(oldName, t);
    setEditingPlayer(null); setEditName('');
  };

  const handleRemove = (name) => {
    if (rounds.some(r => r.player === name)) {
      if (!window.confirm(`„${name}" hat bereits Runden gespielt. Fortfahren?`)) return;
    }
    removePlayer(name);
  };

  const n = players.length;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Tischeinstellungen</h1>
        <p className="page-subtitle">Reihenfolge per Drag &amp; Drop festlegen — Position 1 ist immer Geber.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'start' }}>

        {/* ── Left: list ── */}
        <div style={{ maxWidth: '520px' }}>

          {/* Add player */}
          <section className="form-section">
            <label className="section-label">Neuen Spieler hinzufügen</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Spielername…"
                style={{ flex: 1, backgroundColor: 'var(--surface-high)', border: '1px solid transparent', borderRadius: '0.5rem', padding: '1rem 1.25rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)' }}
              />
              <button className="btn-primary" onClick={handleAdd} style={{ padding: '1rem 1.75rem' }}>
                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}>person_add</span>
                Hinzufügen
              </button>
            </div>
          </section>

          {/* Drag-and-drop list */}
          <section className="form-section" style={{ marginTop: '2rem' }}>
            <label className="section-label">Sitzreihenfolge ({n} Spieler)</label>
            <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Ziehe die Spieler in die gewünschte Reihenfolge.
              {n === 4 && ' Bei 4 Spielern setzt Position 1 aus.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {players.map((name, i) => {
                const ri    = roleIndex(i, n);
                const color = ROLE_COLORS[ri];
                const label = ROLE_LABELS[ri];
                const icon  = ROLE_ICONS[ri];
                const isOver = dragOver === i;

                return (
                  <div
                    key={name}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragEnter={() => onDragEnter(i)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDrop(i)}
                    onDragEnd={onDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.875rem 1.125rem',
                      backgroundColor: isOver ? 'var(--primary-container)' : 'var(--surface-low)',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${isOver ? 'var(--primary)' : 'transparent'}`,
                      cursor: 'grab',
                      transition: 'background 0.15s, border-color 0.15s',
                      userSelect: 'none',
                    }}
                  >
                    {/* Drag handle */}
                    <span className="material-symbols-outlined"
                      style={{ fontSize: '1.25rem', color: 'var(--outline)', flexShrink: 0 }}>
                      drag_indicator
                    </span>

                    {/* Position number */}
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: color, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8125rem', fontWeight: 800,
                    }}>
                      {i + 1}
                    </span>

                    {/* Name / edit */}
                    <div style={{ flex: 1 }}>
                      {editingPlayer === name ? (
                        <input type="text" value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(name); if (e.key === 'Escape') { setEditingPlayer(null); setEditName(''); } }}
                          onBlur={() => handleRename(name)} autoFocus
                          onClick={e => e.stopPropagation()}
                          style={{ backgroundColor: 'var(--surface-highest)', border: '1px solid var(--primary)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', width: '160px' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{name}</span>
                      )}
                    </div>

                    {/* Role badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                      padding: '0.25rem 0.625rem', borderRadius: '999px',
                      color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                      textTransform: 'uppercase', flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{icon}</span>
                      {label}
                    </span>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); setEditingPlayer(name); setEditName(name); }}
                        title="Umbenennen"
                        style={{ padding: '0.4rem', borderRadius: '0.375rem', color: 'var(--outline)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleRemove(name); }}
                        title="Entfernen" disabled={n <= 3}
                        style={{ padding: '0.4rem', borderRadius: '0.375rem', color: n <= 3 ? 'var(--outline-variant)' : 'var(--secondary)', background: 'none', border: 'none', cursor: n <= 3 ? 'not-allowed' : 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>person_remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: 'var(--outline)' }}>
              {n <= 3 ? 'Mindestens 3 Spieler erforderlich.' : 'Maximal 4 Spieler erlaubt.'}
            </p>
          </section>
        </div>

        {/* ── Right: read-only table visualization ── */}
        <div style={{ position: 'sticky', top: '2rem', width: '300px' }}>
          <label className="section-label" style={{ display: 'block', marginBottom: '1rem' }}>Tischansicht</label>
          <div style={{ backgroundColor: 'var(--surface-low)', borderRadius: '1rem', padding: '1.25rem 1rem 1rem' }}>
            <RoundTable seating={players} />

            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1.25rem', justifyContent: 'center' }}>
              {ROLE_LABELS.slice(0, n === 4 ? 4 : 3).map((label, ri) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                  padding: '0.2rem 0.6rem', borderRadius: '999px',
                  color: ROLE_COLORS[ri],
                  backgroundColor: `color-mix(in srgb, ${ROLE_COLORS[ri]} 15%, transparent)`,
                  textTransform: 'uppercase',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>{ROLE_ICONS[ri]}</span>
                  {label}
                </span>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.875rem', lineHeight: 1.5 }}>
              Nur zur Ansicht — Reihenfolge links ändern.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
