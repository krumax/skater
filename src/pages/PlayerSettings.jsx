import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useIconset } from '../context/IconsetContext';
import SuitIcon from '../components/SuitIcon';
import * as syncService from '../lib/syncService';
import { supabase } from '../lib/supabaseClient';
// ── Role helpers ─────────────────────────────────────────────────────────────
const ROLE_LABELS  = ['Geben', 'Hören', 'Sagen', 'Aussetzen'];
const ROLE_ICONS   = ['style', 'hearing', 'record_voice_over', 'pause_circle'];
const ROLE_COLORS  = ['var(--primary)', 'var(--tertiary)', '#e67e22', 'var(--outline)'];

function roleIndex(position, totalPlayers) {
  return totalPlayers === 4 ? [3, 0, 1, 2][position] : position;
}

// ── Read-only round table SVG ────────────────────────────────────────────────
function RoundTable({ seating }) {
  const n = seating.length;
  const cx = 155, cy = 155, r = 105;
  function pos(i) {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  return (
    <svg viewBox="0 0 310 310" width="100%" style={{ display: 'block', margin: '0 auto', maxWidth: '310px' }}>
      <circle cx={cx} cy={cy} r={62} fill="var(--surface-high)" stroke="var(--outline-variant)" strokeWidth="1.5" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fill="var(--outline)" fontFamily="inherit" fontWeight="700" letterSpacing="0.1em">TISCH</text>
      {seating.map((_, i) => {
        const p = pos(i), a = (2 * Math.PI * i) / n - Math.PI / 2;
        return <line key={i} x1={cx + 64 * Math.cos(a)} y1={cy + 64 * Math.sin(a)} x2={p.x} y2={p.y}
          stroke="var(--outline-variant)" strokeWidth="1" strokeDasharray="3 3" />;
      })}
      {seating.map((name, i) => {
        const p = pos(i), ri = roleIndex(i, n), color = ROLE_COLORS[ri];
        return (
          <g key={name}>
            <circle cx={p.x} cy={p.y} r={28} fill="var(--surface-low)" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={p.y - 5} textAnchor="middle" dominantBaseline="middle"
              fontSize="15" fontWeight="800" fill={color} fontFamily="inherit">
              {name.charAt(0).toUpperCase()}
            </text>
            <text x={p.x} y={p.y + 11} textAnchor="middle" fontSize="9.5" fontWeight="600" fill={color} fontFamily="inherit">
              {name.length > 8 ? name.slice(0, 7) + '…' : name}
            </text>
            <rect x={p.x - 20} y={p.y + 30} width={40} height={14} rx={7} fill={color} opacity="0.85" />
            <text x={p.x} y={p.y + 37.5} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontWeight="800" fill="white" fontFamily="inherit" letterSpacing="0.04em">
              {ROLE_LABELS[ri].toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── New table wizard ─────────────────────────────────────────────────────────
function NewTableWizard({ onConfirm, onCancel }) {
  const [tableName, setTableName] = useState('');
  const [seats, setSeats] = useState(['', '', '']);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = Eingabe, 2 = Bestätigung

  const addSeat = () => { if (seats.length < 4) setSeats([...seats, '']); };
  const removeSeat = (i) => { if (seats.length > 3) setSeats(seats.filter((_, idx) => idx !== i)); };
  const updateSeat = (i, val) => setSeats(seats.map((s, idx) => idx === i ? val : s));

  const handleNext = () => {
    const filled = seats.map(s => s.trim()).filter(Boolean);
    if (filled.length < 3) { setError('Mindestens 3 Spielernamen eingeben.'); return; }
    if (new Set(filled).size !== filled.length) { setError('Spielernamen müssen eindeutig sein.'); return; }
    setError('');
    setStep(2);
  };

  const handleConfirm = () => {
    const filled = seats.map(s => s.trim()).filter(Boolean);
    onConfirm(filled, tableName.trim());
  };

  const filledSeats = seats.map(s => s.trim()).filter(Boolean);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: '1rem', padding: '2rem',
        width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 800,
                backgroundColor: step >= s ? 'var(--primary)' : 'var(--surface-high)',
                color: step >= s ? '#fff' : 'var(--outline)',
              }}>{s}</div>
              {s < 2 && <div style={{ width: '32px', height: '2px', backgroundColor: step > s ? 'var(--primary)' : 'var(--outline-variant)', borderRadius: '1px' }} />}
            </div>
          ))}
          <span style={{ fontSize: '0.75rem', color: 'var(--outline)', marginLeft: '0.25rem' }}>
            {step === 1 ? 'Spieler festlegen' : 'Bereit zum Spielen'}
          </span>
        </div>

        {step === 1 ? (
          <>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>Neuer Tisch</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1.5rem' }}>
              3–4 Spieler festlegen. Position 1 ist der erste Geber.
            </p>

            <label className="section-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Tischname (optional)</label>
            <input
              type="text" value={tableName} placeholder="z. B. Stammtisch, Freitagsrunde…"
              onChange={e => setTableName(e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--surface-high)', border: '1px solid transparent', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '1.25rem', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.25rem' }}>
              {seats.map((seat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    backgroundColor: ROLE_COLORS[roleIndex(i, seats.length)],
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 800,
                  }}>{i + 1}</span>
                  <input
                    type="text" value={seat} placeholder={`Spieler ${i + 1}${i === 0 ? ' (Geber)' : ''}`}
                    onChange={e => updateSeat(i, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNext()}
                    style={{ flex: 1, backgroundColor: 'var(--surface-high)', border: '1px solid transparent', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)' }}
                  />
                  {seats.length > 3 && (
                    <button onClick={() => removeSeat(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>remove_circle</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {seats.length < 4 && (
              <button onClick={addSeat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px dashed var(--outline-variant)', borderRadius: '0.5rem', padding: '0.625rem 1rem', color: 'var(--outline)', cursor: 'pointer', fontSize: '0.875rem', width: '100%', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add</span>
                4. Spieler hinzufügen
              </button>
            )}

            {error && <p style={{ color: 'var(--secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'none', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}>
                Abbrechen
              </button>
              <button onClick={handleNext} className="btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                Weiter
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>Bereit zum Spielen!</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1.5rem' }}>
              {tableName ? `„${tableName}" ist eingerichtet.` : 'Dein Tisch ist eingerichtet.'} So geht es weiter:
            </p>

            {/* Spieler-Vorschau */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {filledSeats.map((name, i) => (
                <span key={name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 700,
                  backgroundColor: `color-mix(in srgb, ${ROLE_COLORS[roleIndex(i, filledSeats.length)]} 15%, transparent)`,
                  color: ROLE_COLORS[roleIndex(i, filledSeats.length)],
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{ROLE_ICONS[roleIndex(i, filledSeats.length)]}</span>
                  {name}
                </span>
              ))}
            </div>

            {/* 3-Schritt-Erklärung */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.75rem' }}>
              {[
                { icon: 'person', color: 'var(--primary)', title: 'Alleinspieler wählen', desc: 'Wer spielt allein gegen die anderen? Tippe auf den Namen.' },
                { icon: 'style', color: 'var(--tertiary)', title: 'Spieltyp & Modifikatoren', desc: 'Kreuz, Pik, Herz, Karo, Grand oder Null — plus Hand, Schneider, Schwarz usw.' },
                { icon: 'save', color: '#52B788', title: 'Ergebnis speichern', desc: 'Punkte werden automatisch berechnet und der Tischstand aktualisiert.' },
              ].map(({ icon, color, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color }}>{icon}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.15rem' }}>{title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--outline)', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'none', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}>
                Zurück
              </button>
              <button onClick={handleConfirm} className="btn-primary" style={{ padding: '0.75rem 1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>play_arrow</span>
                Los geht's!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function PlayerSettings() {
  const {
    players, geberIndex, sessionId,
    addPlayer, removePlayer, renamePlayer, reorderSeating,
    rounds, switchSession, createNewTable, tableName, renameTable, clearSession,
  } = useGame();

  const navigate = useNavigate();

  const [newName, setNewName]             = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editName, setEditName]           = useState('');
  const [showWizard, setShowWizard]       = useState(false);
  const [allSessions, setAllSessions]     = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [editingTableName, setEditingTableName] = useState(false);
  const [tableNameDraft, setTableNameDraft]     = useState('');

  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  // Load all sessions for the switcher
  useEffect(() => {
    setLoadingSessions(true);
    syncService.listSessions().then(({ data }) => {
      setAllSessions(data ?? []);
      setLoadingSessions(false);
    });
  }, [sessionId]); // refresh when active session changes

  // ── Drag handlers ──
  const onDragStart = (i) => { dragIndex.current = i; };
  const onDragEnter = (i) => { if (i !== dragIndex.current) setDragOver(i); };
  const onDragEnd   = ()  => { setDragOver(null); dragIndex.current = null; };
  const onDrop      = (i) => {
    if (dragIndex.current !== null && dragIndex.current !== i)
      reorderSeating(dragIndex.current, i);
    setDragOver(null); dragIndex.current = null;
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
    if (name !== '-' && rounds.some(r => r.player === name))
      if (!window.confirm(`„${name}" hat bereits Runden gespielt. Fortfahren?`)) return;
    removePlayer(name);
  };

  const handleCreateTable = async (seating, name) => {
    setShowWizard(false);
    await createNewTable(seating, name);
    navigate('/');
  };

  const handleDeleteSession = async (id, label) => {
    setDeleteSessionTarget({ id, label });
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionTarget) return;
    const { id } = deleteSessionTarget;
    setDeletingSession(true);
    await syncService.deleteSession(id);
    const remaining = allSessions.filter(s => s.id !== id);
    setAllSessions(remaining);
    setDeleteSessionTarget(null);
    setDeletingSession(false);
    // If we deleted the active session or the last session, clear all state and stay on settings
    if (id === sessionId || remaining.length === 0) {
      clearSession();
    }
  };

  const [deleteSessionTarget, setDeleteSessionTarget] = useState(null); // { id, label }
  const [deletingSession, setDeletingSession] = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  // ── Slot identity state ──
  const [slotAssignments, setSlotAssignments] = useState([]); // session_players rows for current session
  const [inviteLink, setInviteLink] = useState(null); // { slotIndex, url }
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserEmail(session?.user?.email ?? '');
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  // Load session_players for the current session
  useEffect(() => {
    if (!sessionId) return;
    supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .then(({ data }) => {
        setSlotAssignments(data ?? []);
      });
  }, [sessionId]);

  const handleClaimSelf = async (slotIndex, displayName) => {
    if (!currentUserId) return;
    // Upsert session_players row with current user's id
    const { error } = await supabase
      .from('session_players')
      .upsert(
        { session_id: sessionId, slot_index: slotIndex, display_name: displayName, user_id: currentUserId },
        { onConflict: 'session_id,slot_index' }
      );
    if (!error) {
      // Refresh slot assignments
      const { data } = await supabase.from('session_players').select('*').eq('session_id', sessionId);
      setSlotAssignments(data ?? []);
    }
  };

  const [showUnclaimModal, setShowUnclaimModal] = useState(false);
  const [unclaimingSlot, setUnclaimingSlot] = useState(false);
  const [unclaimName, setUnclaimName] = useState('');

  const handleUnclaimSelf = async () => {
    if (!currentUserId || !sessionId) return;
    setUnclaimingSlot(true);
    const { error } = await syncService.unclaimSlot(sessionId, currentUserId);
    if (!error) {
      const { data } = await supabase.from('session_players').select('*').eq('session_id', sessionId);
      setSlotAssignments(data ?? []);
    }
    setUnclaimingSlot(false);
    setShowUnclaimModal(false);
    setUnclaimName('');
  };

  const handleGenerateInvite = async (slotIndex) => {
    const { data, error } = await syncService.generateClaimToken(sessionId, slotIndex);
    if (error) {
      alert(error.message ?? 'Fehler beim Generieren des Einladungslinks.');
      return;
    }
    if (data) {
      setInviteLink({ slotIndex, url: data.inviteUrl });
      setInviteCopied(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteLink?.url) {
      navigator.clipboard.writeText(inviteLink.url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error(await res.text());
      await supabase.auth.signOut();
    } catch (e) {
      setDeleteError(e.message ?? 'Unbekannter Fehler');
      setDeletingAccount(false);
    }
  };

  const n = players.length;

  const { iconset, setIconset } = useIconset();

  const ICONSET_OPTIONS = [
    {
      key: 'french',
      label: 'Französisches Blatt',
      suits: [
        { type: 'club', label: 'Kreuz' },
        { type: 'spade', label: 'Pik' },
        { type: 'heart', label: 'Herz' },
        { type: 'diamond', label: 'Karo' },
      ],
    },
    {
      key: 'altenburg',
      label: 'Altenburger Blatt',
      suits: [
        { type: 'club', label: 'Eichel' },
        { type: 'spade', label: 'Grün' },
        { type: 'heart', label: 'Rot' },
        { type: 'diamond', label: 'Schellen' },
      ],
    },
  ];

  return (
    <div>
      <header className="page-header settings-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Einstellungen</h1>
          <p className="page-subtitle">Reihenfolge per Drag &amp; Drop - Position 1 ist immer Geber.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
            {editingTableName ? (
              <>
                <input
                  autoFocus
                  type="text"
                  value={tableNameDraft}
                  onChange={e => setTableNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { renameTable(tableNameDraft); setEditingTableName(false); }
                    if (e.key === 'Escape') setEditingTableName(false);
                  }}
                  placeholder="Tischname…"
                  style={{ backgroundColor: 'var(--surface-high)', border: '1px solid var(--primary)', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', width: '220px' }}
                />
                <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  onClick={() => { renameTable(tableNameDraft); setEditingTableName(false); }}>
                  Speichern
                </button>
                <button onClick={() => setEditingTableName(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', padding: '0.4rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => { setTableNameDraft(tableName); setEditingTableName(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px dashed var(--outline-variant)', borderRadius: '0.5rem', padding: '0.4rem 0.875rem', color: tableName ? 'var(--on-surface)' : 'var(--outline)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
                {tableName || 'Tischname vergeben…'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Hint: no active table ── */}
      {players.length === 0 && !loadingSessions && allSessions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', borderRadius: '0.75rem', backgroundColor: 'var(--surface-high, #f5f5f0)', border: '1px solid var(--outline-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>info</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--on-surface)' }}>
            Kein Tisch aktiv. Wähle unten einen Tisch aus oder lege einen neuen an.
          </span>
        </div>
      )}

      {/* ── Table switcher ── */}
      {!loadingSessions && (
        <section style={{ marginBottom: '2.5rem' }}>
          <label className="section-label" style={{ display: 'block', marginBottom: '0.875rem' }}>Tische wechseln</label>
          <div className="session-switcher" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem' }}>
            {allSessions.map(s => {
              const isActive = s.id === sessionId;
              const label = s.table_name || (Array.isArray(s.seating) ? s.seating.join(', ') : s.id.slice(0, 8));
              const seats = Array.isArray(s.seating) ? s.seating : [];
              const date = new Date(s.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const roundCount = s.current_round - 1;
              return (
                <div key={s.id} style={{ position: 'relative', display: 'flex' }}>
                  <button onClick={() => !isActive && switchSession(s.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                      padding: '1rem 2.25rem 1rem 1rem',
                      borderRadius: '0.75rem', cursor: isActive ? 'default' : 'pointer',
                      border: `2px solid ${isActive ? 'var(--primary)' : 'var(--outline-variant)'}`,
                      backgroundColor: isActive ? 'color-mix(in srgb, var(--primary) 12%, var(--surface))' : 'var(--surface-low)',
                      color: 'var(--on-surface)', fontFamily: 'inherit', textAlign: 'left',
                      width: '100%', height: '100%', transition: 'all 0.15s',
                      boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 1px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
                    }}>
                    {/* Table icon */}
                    <span className="material-symbols-outlined" style={{
                      fontSize: '2rem',
                      color: isActive ? 'var(--primary)' : 'var(--outline)',
                      flexShrink: 0, marginTop: '0.1rem',
                    }}>
                      table_restaurant
                    </span>
                    {/* Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--outline)', marginTop: '0.2rem' }}>
                        {seats.join(', ')}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--outline)', marginTop: '0.15rem' }}>
                        {date} · {roundCount} Runden
                      </span>
                      {isActive && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Aktiv
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                      onClick={() => handleDeleteSession(s.id, label)}
                      title="Tisch löschen"
                      style={{
                        position: 'absolute', top: '0.5rem', right: '0.5rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--outline)', padding: '0.2rem', borderRadius: '0.25rem',
                        lineHeight: 1, opacity: 0.5,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                    </button>
                </div>
              );
            })}
            {/* ── New table tile ── */}
            <div style={{ position: 'relative', display: 'flex' }}>
              <button
                onClick={() => setShowWizard(true)}
                title="Neuer Tisch"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem',
                  borderRadius: '0.75rem', cursor: 'pointer',
                  border: '2px dashed var(--outline-variant)',
                  backgroundColor: 'var(--surface-low)',
                  color: 'var(--outline)', fontFamily: 'inherit',
                  width: '100%', height: '100%', transition: 'all 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>add</span>
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3rem', alignItems: 'start' }}>

        {/* ── Left: list ── */}
        <div style={{ maxWidth: '520px' }}>

          {/* Add player */}
          <section className="form-section">
            <label className="section-label">Spieler hinzufügen</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="Spielername…"
                style={{ flex: 1, backgroundColor: 'var(--surface-high)', border: '1px solid transparent', borderRadius: '0.5rem', padding: '1rem 1.25rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', minWidth: 0 }} />
              <button className="btn-primary settings-add-btn" onClick={handleAdd} style={{ padding: '1rem 1.75rem', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}>person_add</span>
                Hinzufügen
              </button>
            </div>
          </section>

          {/* Drag list */}
          <section className="form-section" style={{ marginTop: '2rem' }}>
            <label className="section-label">Sitzreihenfolge ({n} Spieler)
              <span
                className="material-symbols-outlined"
                title="Die Sitzreihenfolge bestimmt die Rollen: Position 1 = Geber (teilt aus), Position 2 = Hören, Position 3 = Sagen. Bei 4 Spielern setzt Position 1 aus. Nach jeder Runde rotieren die Rollen automatisch."
                style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, verticalAlign: 'middle', marginLeft: '0.35rem', fontVariationSettings: "'FILL' 0" }}
              >info</span>
            </label>
            <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Ziehe die Spieler in die gewünschte Reihenfolge.{n === 4 && ' Bei 4 Spielern setzt Position 1 aus.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {players.map((name, i) => {
                const ri = roleIndex(i, n), color = ROLE_COLORS[ri], isOver = dragOver === i;
                return (
                  <div key={name} draggable
                    onDragStart={() => onDragStart(i)} onDragEnter={() => onDragEnter(i)}
                    onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)} onDragEnd={onDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.875rem 1.125rem',
                      backgroundColor: isOver ? 'var(--primary-container)' : 'var(--surface-low)',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${isOver ? 'var(--primary)' : 'transparent'}`,
                      cursor: 'grab', userSelect: 'none', transition: 'background 0.15s, border-color 0.15s',
                    }}>
                    <span className="material-symbols-outlined drag-handle" style={{ fontSize: '1.25rem', color: 'var(--outline)', flexShrink: 0 }}>drag_indicator</span>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, backgroundColor: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 800 }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      {editingPlayer === name ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(name); if (e.key === 'Escape') { setEditingPlayer(null); setEditName(''); } }}
                          onBlur={() => handleRename(name)} autoFocus onClick={e => e.stopPropagation()}
                          style={{ backgroundColor: 'var(--surface-highest)', border: '1px solid var(--primary)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', width: '160px' }} />
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{name}</span>
                      )}
                    </div>
                    <span className="seating-row-role" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', padding: '0.25rem 0.625rem', borderRadius: '999px', color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, textTransform: 'uppercase', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>{ROLE_ICONS[ri]}</span>
                      {ROLE_LABELS[ri]}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); setEditingPlayer(name); setEditName(name); }} title="Umbenennen"
                        style={{ padding: '0.4rem', borderRadius: '0.375rem', color: 'var(--outline)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleRemove(name); }} title="Entfernen" disabled={n <= 3 && name !== '-'}
                        style={{ padding: '0.4rem', borderRadius: '0.375rem', color: (n <= 3 && name !== '-') ? 'var(--outline-variant)' : 'var(--secondary)', background: 'none', border: 'none', cursor: (n <= 3 && name !== '-') ? 'not-allowed' : 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>person_remove</span>
                      </button>
                      <button
                        className="seating-reorder-btn"
                        onClick={e => { e.stopPropagation(); if (i > 0) reorderSeating(i, i - 1); }}
                        disabled={i === 0}
                        title="Nach oben"
                        aria-label={`${name} nach oben`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_upward</span>
                      </button>
                      <button
                        className="seating-reorder-btn"
                        onClick={e => { e.stopPropagation(); if (i < players.length - 1) reorderSeating(i, i + 1); }}
                        disabled={i === players.length - 1}
                        title="Nach unten"
                        aria-label={`${name} nach unten`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_downward</span>
                      </button>
                      {/* ── Identity buttons ── */}
                      {(() => {
                        const slotRow = slotAssignments.find(s => s.slot_index === i);
                        const isMyClaim = currentUserId && slotRow?.user_id === currentUserId;
                        const isClaimedByOther = slotRow?.user_id && slotRow.user_id !== currentUserId;
                        const mySlotElsewhere = slotAssignments.find(s => s.user_id && s.user_id === currentUserId);

                        if (isMyClaim) {
                          return (
                            <button
                              onClick={e => { e.stopPropagation(); setUnclaimName(name); setShowUnclaimModal(true); }}
                              title="Verknüpfung lösen"
                              style={{ padding: '0.4rem', borderRadius: '0.375rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>verified</span>
                            </button>
                          );
                        }
                        if (isClaimedByOther) {
                          return (
                            <span title="Verknüpft mit anderem Account" style={{ padding: '0.4rem', color: 'var(--outline)', display: 'flex', alignItems: 'center' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>link</span>
                            </span>
                          );
                        }
                        // Not claimed — show "Das bin ich" (if I haven't claimed another slot) and "Einladen"
                        return (
                          <>
                            {!mySlotElsewhere && (
                              <button
                                onClick={e => { e.stopPropagation(); handleClaimSelf(i, name); }}
                                title="Das bin ich"
                                style={{ padding: '0.4rem', borderRadius: '0.375rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>person_pin</span>
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); handleGenerateInvite(i); }}
                              title="Einladungslink generieren"
                              style={{ padding: '0.4rem', borderRadius: '0.375rem', color: 'var(--tertiary, #6750a4)', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>share</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: 'var(--outline)' }}>
              {n <= 3 ? 'Mindestens 3 Spieler erforderlich.' : 'Maximal 4 Spieler erlaubt.'}
            </p>
          </section>

          {/* ── Invite link banner ── */}
          {inviteLink && (
            <section className="form-section" style={{ marginTop: '1.5rem' }}>
              <div className="card" style={{ backgroundColor: 'var(--surface-low)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--outline-variant)' }}>
                <p style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--on-surface)' }}>
                  Einladungslink für Spieler {players[inviteLink.slotIndex] ?? `Slot ${inviteLink.slotIndex + 1}`}:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={inviteLink.url}
                    style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface)', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--on-surface)' }}
                    onClick={e => e.target.select()}
                  />
                  <button
                    onClick={handleCopyInvite}
                    className="btn-primary"
                    style={{ padding: '0.6rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                      {inviteCopied ? 'check' : 'content_copy'}
                    </span>
                    {inviteCopied ? 'Kopiert!' : 'Kopieren'}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem' }}>
                  Der Link ist 72 Stunden gültig. Teile ihn mit dem Mitspieler.
                </p>
                <button
                  onClick={() => setInviteLink(null)}
                  style={{ marginTop: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  Schließen
                </button>
              </div>
            </section>
          )}

          {/* Iconset selector */}
          <section className="form-section" style={{ marginTop: '2rem' }}>
            <label className="section-label">Kartensymbole</label>
            <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1rem' }}>
              Wähle zwischen dem Französischen Blatt (Kreuz, Pik, Herz, Karo) und dem Altenburger Blatt (Eichel, Grün, Rot, Schellen).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {ICONSET_OPTIONS.map(option => {
                const isActive = iconset === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => setIconset(option.key)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: '0.75rem',
                      padding: '1rem 1.25rem', borderRadius: '0.75rem',
                      border: `2px solid ${isActive ? 'var(--primary)' : 'var(--outline-variant)'}`,
                      backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-low)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: isActive ? '#fff' : 'var(--on-surface)' }}>
                        {option.label}
                      </span>
                      {isActive && (
                        <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.25rem' }}>
                          check_circle
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {option.suits.map(suit => (
                        <div key={suit.type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <SuitIcon gameType={suit.type} size="xl" forceIconset={option.key} color={isActive ? '#fff' : undefined} />
                          <span style={{ fontSize: '0.875rem', color: isActive ? 'rgba(255,255,255,0.85)' : 'var(--on-surface-variant)' }}>
                            {suit.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Right: read-only table ── */}
        <div className="settings-table-preview" style={{ position: 'sticky', top: '2rem', width: '340px' }}>
          <label className="section-label" style={{ display: 'block', marginBottom: '1rem' }}>Tischansicht</label>
          <div style={{ backgroundColor: 'var(--surface-low)', borderRadius: '1rem', padding: '1.5rem 1.25rem 1.25rem' }}>
            <RoundTable seating={players} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '1.25rem', justifyContent: 'center' }}>
              {ROLE_LABELS.slice(0, n === 4 ? 4 : 3).map((label, ri) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', padding: '0.2rem 0.6rem', borderRadius: '999px', color: ROLE_COLORS[ri], backgroundColor: `color-mix(in srgb, ${ROLE_COLORS[ri]} 15%, transparent)`, textTransform: 'uppercase' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>{ROLE_ICONS[ri]}</span>
                  {label}
                </span>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--outline)', marginTop: '0.875rem', lineHeight: 1.5 }}>
              Nur zur Ansicht - Reihenfolge links ändern.
            </p>
          </div>
        </div>
      </div>

      {showWizard && (
        <NewTableWizard onConfirm={handleCreateTable} onCancel={() => setShowWizard(false)} />
      )}

      {/* ── Tisch löschen Modal ── */}
      {deleteSessionTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', backgroundColor: 'color-mix(in srgb, var(--secondary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '1.25rem' }}>delete_forever</span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--secondary)' }}>Tisch löschen?</h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              <strong>„{deleteSessionTarget.label}"</strong> wird unwiderruflich gelöscht.
            </p>
            <ul style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1.5rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
              <li>Alle Rundendaten und die komplette Spielhistorie</li>
              <li>Statistiken und Achievements dieses Tisches</li>
              <li>Alle Spielserien, die diesem Tisch zugeordnet sind</li>
            </ul>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteSessionTarget(null)}
                disabled={deletingSession}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'none', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDeleteSession}
                disabled={deletingSession}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--secondary)', color: 'white', border: 'none', cursor: deletingSession ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, opacity: deletingSession ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete_forever</span>
                {deletingSession ? 'Wird gelöscht…' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Verknüpfung lösen Modal ── */}
      {showUnclaimModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>person_remove</span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Verknüpfung lösen?</h2>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--on-surface)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              Möchtest du deine Verknüpfung mit <strong>„{unclaimName}"</strong> wirklich lösen?
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--outline)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Du kannst danach einen anderen Platz beanspruchen. Deine bisherigen Runden bleiben erhalten.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowUnclaimModal(false); setUnclaimName(''); }}
                disabled={unclaimingSlot}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'none', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleUnclaimSelf}
                disabled={unclaimingSlot}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: unclaimingSlot ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, opacity: unclaimingSlot ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>link_off</span>
                {unclaimingSlot ? 'Wird gelöst…' : 'Verknüpfung lösen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Abmelden ── */}
      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--outline-variant)' }}>
        <label className="section-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Account</label>
        <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1rem' }}>
          Meldet dich ab. Deine Daten bleiben gespeichert.
        </p>
        {currentUserEmail && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--outline)' }}>account_circle</span>
            {currentUserEmail}
          </p>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--outline-variant)', background: 'none', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 700 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>logout</span>
          Abmelden
        </button>
      </section>

      {/* ── Account löschen ── */}
      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--outline-variant)' }}>
        <label className="section-label" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--secondary)' }}>
          Gefahrenzone
        </label>
        <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1rem' }}>
          Löscht deinen Account und alle gespeicherten Daten unwiderruflich.
        </p>
        <button
          onClick={() => { setShowDeleteAccount(true); setDeleteConfirmText(''); setDeleteError(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', border: '1px solid var(--secondary)', background: 'none', color: 'var(--secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 700 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete_forever</span>
          Account löschen
        </button>
      </section>

      {/* ── Delete account modal ── */}
      {showDeleteAccount && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--secondary)' }}>Account wirklich löschen?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--outline)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Alle deine Tische, Runden und Statistiken werden <strong>unwiderruflich</strong> gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              Tippe <strong>LÖSCHEN</strong> zur Bestätigung:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--outline-variant)', backgroundColor: 'var(--surface-low)', fontFamily: 'inherit', fontSize: '1rem', color: 'var(--on-surface)', marginBottom: '1rem' }}
            />
            {deleteError && (
              <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '1rem' }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteAccount(false)}
                disabled={deletingAccount}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', background: 'none', border: '1px solid var(--outline-variant)', color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'LÖSCHEN' || deletingAccount}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', backgroundColor: deleteConfirmText === 'LÖSCHEN' ? 'var(--secondary)' : 'var(--outline-variant)', color: 'white', border: 'none', cursor: deleteConfirmText === 'LÖSCHEN' ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, opacity: deletingAccount ? 0.6 : 1 }}
              >
                {deletingAccount ? '…' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
