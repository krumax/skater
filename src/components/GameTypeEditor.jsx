import React, { useState, useEffect, useCallback } from 'react';
import { SUIT_LABELS } from '../lib/skatScoring';
import { useGame } from '../context/GameContext';

// ─── Spieltyp-Konstanten ───

export const GAME_TYPES = ['null', 'club', 'spade', 'heart', 'diamond', 'grand'];

/**
 * Gültige Spitzen-Bereiche je Spieltyp.
 * null-Spiele haben kein Spitzen-Feld.
 */
export const SPITZEN_RANGES = {
  club:    { min: 1, max: 11 },
  spade:   { min: 1, max: 11 },
  heart:   { min: 1, max: 11 },
  diamond: { min: 1, max: 11 },
  grand:   { min: 1, max: 4 },
};

// ─── Hilfsfunktionen ───

/**
 * Berechnet den lesbaren Typ-Label aus Spieltyp und Attributen.
 * @param {string} gameType – 'null'|'club'|'spade'|'heart'|'diamond'|'grand'
 * @param {{ hand: boolean, ouvert: boolean }} options
 * @returns {string} z. B. "Kreuz Hand" oder "Null Ouvert Hand"
 */
export function buildTypeLabel(gameType, { hand = false, ouvert = false } = {}) {
  const base = SUIT_LABELS[gameType] ?? gameType;
  const suffixes = [];
  if (hand)   suffixes.push('Hand');
  if (ouvert) suffixes.push('Ouvert');
  return [base, ...suffixes].join(' ');
}

// ─── Komponente ───

/**
 * Modaler Dialog zum Bearbeiten des Spieltyps einer Runde.
 *
 * Props:
 *   round   – die zu bearbeitende Runde
 *   onClose – schließt den Dialog ohne Speichern
 *   onSaved – wird nach erfolgreichem Speichern aufgerufen
 */
export default function GameTypeEditor({ round, onClose, onSaved }) {
  const { updateRound } = useGame();

  // Interner State – vorbelegt mit den aktuellen Werten der Runde
  const [gameType, setGameType]     = useState(
    GAME_TYPES.includes(round?.gameType) ? round.gameType : 'null'
  );
  const [hand, setHand]             = useState(round?.hand ?? false);
  const [ouvert, setOuvert]         = useState(round?.ouvert ?? false);
  const [schneider, setSchneider]   = useState(round?.schneider ?? false);
  const [schwarz, setSchwarz]       = useState(round?.schwarz ?? false);
  const [spitzen, setSpitzen]       = useState(round?.spitzen ?? 1);
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);

  // Spitzen-Validierung bei Änderung von gameType oder spitzen
  useEffect(() => {
    const range = SPITZEN_RANGES[gameType];
    if (!range) {
      setErrors(prev => ({ ...prev, spitzen: undefined }));
      return;
    }
    const val = Number(spitzen);
    if (isNaN(val) || val < range.min || val > range.max) {
      setErrors(prev => ({
        ...prev,
        spitzen: `Spitzen muss zwischen ${range.min} und ${range.max} liegen`,
      }));
    } else {
      setErrors(prev => ({ ...prev, spitzen: undefined }));
    }
  }, [gameType, spitzen]);

  // Escape-Taste schließt den Dialog
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isNullGame   = gameType === 'null';
  const hasSuiteGame = !isNullGame;
  const hasErrors    = Object.values(errors).some(Boolean);
  const canSave      = !hasErrors && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setErrors(prev => ({ ...prev, general: undefined }));

    const patch = {
      gameType,
      typeLabel: buildTypeLabel(gameType, { hand, ouvert }),
      hand,
      ouvert,
      schneider,
      schwarz,
      spitzen: hasSuiteGame ? Number(spitzen) : 0,
    };

    const { error } = await updateRound(round, patch);
    setSaving(false);

    if (error) {
      setErrors(prev => ({ ...prev, general: error.message ?? 'Fehler beim Speichern' }));
      return;
    }
    onSaved();
  }

  return (
    /* Overlay – Klick außerhalb schließt den Dialog */
    <div
      role="presentation"
      style={overlayStyle}
      onClick={onClose}
    >
      {/* Dialog – Klick innerhalb stoppt Propagation */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Spieltyp bearbeiten"
        style={dialogStyle}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: '#1a1a2e' }}>
          Spieltyp bearbeiten
          <span style={{ color: '#555577', fontWeight: 400, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
            Runde {round?.roundNumber ?? round?.id}
          </span>
        </h2>

        {/* Spieltyp-Auswahl */}
        <label style={labelStyle}>Spieltyp</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {GAME_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setGameType(type)}
              style={{
                ...chipStyle,
                ...(gameType === type ? chipActiveStyle : {}),
              }}
            >
              {SUIT_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Checkboxen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginBottom: '1.25rem' }}>
          <CheckboxField label="Hand"      checked={hand}      onChange={setHand} />
          <CheckboxField label="Ouvert"    checked={ouvert}    onChange={setOuvert} />
          {hasSuiteGame && (
            <>
              <CheckboxField label="Schneider" checked={schneider} onChange={setSchneider} />
              <CheckboxField label="Schwarz"   checked={schwarz}   onChange={setSchwarz} />
            </>
          )}
        </div>

        {/* Spitzen-Eingabe (nur bei Farb-/Grand-Spielen) */}
        {hasSuiteGame && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>
              Spitzen
              <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.25rem' }}>
                ({SPITZEN_RANGES[gameType].min}–{SPITZEN_RANGES[gameType].max})
              </span>
            </label>
            <input
              type="number"
              value={spitzen}
              min={SPITZEN_RANGES[gameType].min}
              max={SPITZEN_RANGES[gameType].max}
              onChange={e => setSpitzen(e.target.value)}
              style={{
                ...inputStyle,
                ...(errors.spitzen ? inputErrorStyle : {}),
              }}
            />
            {errors.spitzen && (
              <p role="alert" style={errorTextStyle}>{errors.spitzen}</p>
            )}
          </div>
        )}

        {/* Allgemeiner Fehler */}
        {errors.general && (
          <p role="alert" style={{ ...errorTextStyle, marginBottom: '1rem' }}>{errors.general}</p>
        )}

        {/* Aktions-Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} style={cancelBtnStyle}>
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{ ...saveBtnStyle, ...(!canSave ? saveBtnDisabledStyle : {}) }}
          >
            {saving ? 'Speichern…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hilfskomponente ───

function CheckboxField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', color: '#1a1a2e' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
      />
      {label}
    </label>
  );
}

// ─── Styles ───

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle = {
  background: '#ffffff',
  color: '#1a1a2e',
  borderRadius: '0.75rem',
  padding: '1.75rem',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.4rem',
  color: '#555577',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const chipStyle = {
  padding: '0.35rem 0.85rem',
  borderRadius: '999px',
  border: '1.5px solid #c0c0d0',
  background: 'transparent',
  color: '#1a1a2e',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.15s, border-color 0.15s',
};

const chipActiveStyle = {
  background: '#7c3aed',
  borderColor: '#7c3aed',
  color: '#ffffff',
  fontWeight: 600,
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.4rem',
  border: '1.5px solid #c0c0d0',
  background: '#f5f5fa',
  color: '#1a1a2e',
  fontSize: '1rem',
  boxSizing: 'border-box',
};

const inputErrorStyle = {
  borderColor: '#dc2626',
};

const errorTextStyle = {
  color: '#dc2626',
  fontSize: '0.8rem',
  margin: '0.25rem 0 0',
};

const cancelBtnStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: '0.4rem',
  border: '1.5px solid #c0c0d0',
  background: 'transparent',
  color: '#1a1a2e',
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const saveBtnStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: '0.4rem',
  border: 'none',
  background: '#7c3aed',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const saveBtnDisabledStyle = {
  opacity: 0.45,
  cursor: 'not-allowed',
};
