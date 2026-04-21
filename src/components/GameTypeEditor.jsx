import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SUIT_LABELS, calculateGameValue } from '../lib/skatScoring';
import { useGame } from '../context/GameContext';
import { SUIT_COLORS, SUIT_TEXT_COLORS } from '../lib/tokens';

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
  const [schneiderAnnounced, setSchneiderAnnounced] = useState(round?.schneiderAnnounced ?? false);
  const [schwarz, setSchwarz]       = useState(round?.schwarz ?? false);
  const [schwarzAnnounced, setSchwartzAnnounced]   = useState(round?.schwarzAnnounced ?? false);
  const [spitzen, setSpitzen]       = useState(round?.spitzen ?? 1);
  const [mitOhne, setMitOhne]       = useState(round?.mitOhne ?? 'mit');
  const [isBock, setIsBock]         = useState(round?.isBock ?? false);
  const [won, setWon]               = useState(round?.won ?? true);
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

  // ── Live-Berechnung des neuen Spielwerts ──
  const previewResult = useMemo(() => {
    try {
      const base = calculateGameValue({
        gameType,
        spitzen: hasSuiteGame ? Number(spitzen) : 1,
        hand,
        schneider,
        schneiderAnnounced,
        schwarz,
        schwarzAnnounced,
        ouvert,
        // eyeCount nur für Grundwert/Multiplikator-Berechnung - won überschreiben wir manuell
        eyeCount: won ? 61 : 0,
      });
      // won aus State übernehmen, Spielwert entsprechend anpassen
      const absValue = Math.abs(base.gameValue);
      return {
        ...base,
        won,
        gameValue: won ? absValue : -2 * (base.baseValue * base.multiplier),
      };
    } catch {
      return null;
    }
  }, [gameType, spitzen, hand, schneider, schneiderAnnounced, schwarz, schwarzAnnounced, ouvert, hasSuiteGame, won]);

  const newGameValue = previewResult
    ? (isBock ? previewResult.gameValue * 2 : previewResult.gameValue)
    : null;

  async function handleSave() {
    if (!canSave || newGameValue === null) return;
    setSaving(true);
    setErrors(prev => ({ ...prev, general: undefined }));

    const patch = {
      gameType,
      typeLabel: buildTypeLabel(gameType, { hand, ouvert }),
      hand,
      ouvert,
      schneider,
      schneiderAnnounced,
      schwarz,
      schwarzAnnounced,
      spitzen: hasSuiteGame ? Number(spitzen) : 0,
      mitOhne: hasSuiteGame ? mitOhne : 'mit',
      isBock,
      gameValue: newGameValue,
      won: won,
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
        aria-label="Spiel bearbeiten"
        style={dialogStyle}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: 'var(--on-surface)' }}>
          Spiel bearbeiten
          <span style={{ color: 'var(--outline)', fontWeight: 400, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
            Runde {round?.roundNumber ?? round?.id}
          </span>
        </h2>

        {/* Spieltyp-Auswahl */}
        <label style={labelStyle}>Spieltyp</label>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[
            { key: 'club',    icon: '♣', label: 'Kreuz',  color: null },
            { key: 'spade',   icon: '♠', label: 'Pik',    color: null },
            { key: 'heart',   icon: '♥', label: 'Herz',   color: '#e53935' },
            { key: 'diamond', icon: '♦', label: 'Karo',   color: '#e53935' },
            { key: 'grand',   icon: null, label: 'Grand',  matIcon: 'stars' },
            { key: 'null',    icon: null, label: 'Null',   matIcon: 'block' },
          ].map(({ key, icon, label, matIcon }) => {
            const isActive = gameType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setGameType(key)}
                style={{
                  ...gameTypeChipStyle,
                  ...(isActive ? {
                    background: SUIT_COLORS[key] ?? 'var(--primary)',
                    borderColor: SUIT_COLORS[key] ?? 'var(--primary)',
                    color: SUIT_TEXT_COLORS[key] ?? '#ffffff',
                  } : {}),
                }}
                title={label}
              >
                {icon
                  ? <span style={{ fontSize: '1.25rem', lineHeight: 1, color: isActive ? (SUIT_TEXT_COLORS[key] ?? '#fff') : (SUIT_COLORS[key] ?? 'var(--on-surface)') }}>{icon}</span>
                  : <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', lineHeight: 1, color: isActive ? (SUIT_TEXT_COLORS[key] ?? '#fff') : (SUIT_COLORS[key] ?? 'var(--on-surface)') }}>{matIcon}</span>
                }
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Checkboxen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', marginBottom: '1.25rem' }}>
          <CheckboxField label="Hand"                  checked={hand}                onChange={setHand} />
          <CheckboxField label="Ouvert"                checked={ouvert}              onChange={setOuvert} />
          <CheckboxField label="Schneider"             checked={schneider}           onChange={setSchneider}           disabled={isNullGame} />
          <CheckboxField label="Schneider angesagt"    checked={schneiderAnnounced}  onChange={setSchneiderAnnounced}  disabled={isNullGame} />
          <CheckboxField label="Schwarz"               checked={schwarz}             onChange={setSchwarz}             disabled={isNullGame} />
          <CheckboxField label="Schwarz angesagt"      checked={schwarzAnnounced}    onChange={setSchwartzAnnounced}   disabled={isNullGame} />
        </div>

        {/* Bockrunde */}
        <div style={{ marginBottom: '1.25rem' }}>
          <CheckboxField label="Bockrunde" checked={isBock} onChange={setIsBock} />
        </div>

        {/* Ergebnis */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Ergebnis</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setWon(true)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.4rem', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem', border: '1.5px solid',
                borderColor: won ? 'var(--win-color)' : 'var(--outline-variant)',
                backgroundColor: won ? 'color-mix(in srgb, var(--win-color) 10%, transparent)' : 'transparent',
                color: won ? 'var(--win-color)' : 'var(--on-surface)',
              }}
            >
              ✓ Gewonnen
            </button>
            <button
              type="button"
              onClick={() => setWon(false)}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.4rem', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem', border: '1.5px solid',
                borderColor: !won ? 'var(--loss-color)' : 'var(--outline-variant)',
                backgroundColor: !won ? 'color-mix(in srgb, var(--loss-color) 10%, transparent)' : 'transparent',
                color: !won ? 'var(--loss-color)' : 'var(--on-surface)',
              }}
            >
              ✗ Verloren
            </button>
          </div>
        </div>

        {/* Spitzen-Eingabe (immer sichtbar bei Farb-/Grand-Spielen, ausgegraut wenn nicht erlaubt) */}
        <div style={{ marginBottom: '1.25rem', opacity: hasSuiteGame ? 1 : 0.35, pointerEvents: hasSuiteGame ? 'auto' : 'none' }}>
          <label style={labelStyle}>Ansage</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button type="button" onClick={() => setMitOhne('mit')} className={`chip${mitOhne === 'mit' ? ' active' : ''}`}>Mit</button>
            <button type="button" onClick={() => setMitOhne('ohne')} className={`chip${mitOhne === 'ohne' ? ' active' : ''}`}>Ohne</button>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map(num => {
              const maxAllowed = hasSuiteGame ? SPITZEN_RANGES[gameType]?.max ?? 0 : 0;
              const disabled = num > maxAllowed;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSpitzen(num)}
                  style={{
                    ...spitzenBtnStyle,
                    ...(spitzen === num && !disabled ? spitzenBtnActiveStyle : {}),
                    ...(disabled ? spitzenBtnDisabledStyle : {}),
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spielwert-Vorschau */}
        {previewResult && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem',
            backgroundColor: previewResult.won ? 'color-mix(in srgb, var(--win-color) 10%, transparent)' : 'color-mix(in srgb, var(--loss-color) 10%, transparent)',
            border: `1.5px solid ${previewResult.won ? 'color-mix(in srgb, var(--win-color) 50%, transparent)' : 'color-mix(in srgb, var(--loss-color) 50%, transparent)'}`,
          }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: previewResult.won ? 'var(--win-color)' : 'var(--loss-color)', display: 'block', marginBottom: '0.1rem' }}>
                {previewResult.won ? 'Gewonnen' : 'Verloren'} · Neuer Spielwert
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                {previewResult.baseValue} × {previewResult.multiplier}{isBock ? ' × 2 (Bock)' : ''}
              </span>
            </div>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: previewResult.won ? 'var(--win-color)' : 'var(--loss-color)' }}>
              {newGameValue > 0 ? '+' : ''}{newGameValue}
            </span>
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

function CheckboxField({ label, checked, onChange, disabled = false }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', color: 'var(--on-surface)', opacity: disabled ? 0.35 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ width: '1rem', height: '1rem', cursor: disabled ? 'not-allowed' : 'pointer' }}
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
  background: 'var(--surface)',
  color: 'var(--on-surface)',
  borderRadius: '0.75rem',
  padding: '1.75rem',
  width: '100%',
  maxWidth: '560px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.4rem',
  color: 'var(--outline)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const chipStyle = {
  padding: '0.35rem 0.85rem',
  borderRadius: '999px',
  border: '1.5px solid var(--outline-variant)',
  background: 'transparent',
  color: 'var(--on-surface)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.15s, border-color 0.15s',
};

const chipActiveStyle = {
  background: 'var(--primary)',
  borderColor: 'var(--primary)',
  color: '#ffffff',
  fontWeight: 600,
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.4rem',
  border: '1.5px solid var(--outline-variant)',
  background: '#f5f5fa',
  color: 'var(--on-surface)',
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
  border: '1.5px solid var(--outline-variant)',
  background: 'transparent',
  color: 'var(--on-surface)',
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const saveBtnStyle = {
  padding: '0.5rem 1.25rem',
  borderRadius: '0.4rem',
  border: 'none',
  background: 'var(--primary)',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '0.95rem',
};

const saveBtnDisabledStyle = {
  opacity: 0.45,
  cursor: 'not-allowed',
};

const gameTypeChipStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.2rem',
  width: '60px',
  height: '60px',
  borderRadius: '0.5rem',
  border: '1.5px solid var(--outline-variant)',
  background: 'transparent',
  color: 'var(--on-surface)',
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
};

const spitzenBtnStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '0.4rem',
  border: '1.5px solid var(--outline-variant)',
  background: 'transparent',
  color: 'var(--on-surface)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const spitzenBtnActiveStyle = {
  background: 'var(--primary)',
  borderColor: 'var(--primary)',
  color: '#ffffff',
};

const spitzenBtnDisabledStyle = {
  opacity: 0.25,
  cursor: 'not-allowed',
  pointerEvents: 'none',
};
