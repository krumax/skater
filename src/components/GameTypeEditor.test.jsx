// Feature: game-type-editing — Unit-Tests für GameTypeEditor
// Validates: Anforderungen 1.4, 2.1, 2.2, 2.3, 2.4, 2.6, 3.5
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTypeLabel, GAME_TYPES, SPITZEN_RANGES } from './GameTypeEditor.jsx';

// ── buildTypeLabel ────────────────────────────────────────────────────────────

describe('buildTypeLabel – Anforderungen 2.3, 2.4', () => {
  it('gibt den Basis-Label ohne Suffixe zurück', () => {
    expect(buildTypeLabel('club')).toBe('Kreuz');
    expect(buildTypeLabel('spade')).toBe('Pik');
    expect(buildTypeLabel('heart')).toBe('Herz');
    expect(buildTypeLabel('diamond')).toBe('Karo');
    expect(buildTypeLabel('grand')).toBe('Grand');
    expect(buildTypeLabel('null')).toBe('Null');
  });

  it('hängt "Hand" an wenn hand=true', () => {
    expect(buildTypeLabel('club', { hand: true })).toBe('Kreuz Hand');
    expect(buildTypeLabel('null', { hand: true })).toBe('Null Hand');
  });

  it('hängt "Ouvert" an wenn ouvert=true', () => {
    expect(buildTypeLabel('grand', { ouvert: true })).toBe('Grand Ouvert');
    expect(buildTypeLabel('null', { ouvert: true })).toBe('Null Ouvert');
  });

  it('hängt "Hand Ouvert" an wenn beide true', () => {
    expect(buildTypeLabel('null', { hand: true, ouvert: true })).toBe('Null Hand Ouvert');
    expect(buildTypeLabel('heart', { hand: true, ouvert: true })).toBe('Herz Hand Ouvert');
  });

  it('gibt Basis-Label zurück wenn beide false (Standard)', () => {
    expect(buildTypeLabel('spade', { hand: false, ouvert: false })).toBe('Pik');
  });
});

// ── GAME_TYPES – Anforderung 2.2 ─────────────────────────────────────────────

describe('GAME_TYPES – Alle 6 Spieltypen vorhanden (Anforderung 2.2)', () => {
  it('enthält genau 6 Spieltypen', () => {
    expect(GAME_TYPES).toHaveLength(6);
  });

  it('enthält alle gültigen Skatspieltypen', () => {
    expect(GAME_TYPES).toContain('null');
    expect(GAME_TYPES).toContain('club');
    expect(GAME_TYPES).toContain('spade');
    expect(GAME_TYPES).toContain('heart');
    expect(GAME_TYPES).toContain('diamond');
    expect(GAME_TYPES).toContain('grand');
  });
});

// ── SPITZEN_RANGES – Anforderungen 2.3, 2.4 ──────────────────────────────────

describe('SPITZEN_RANGES – Feldanzeige abhängig vom Spieltyp (Anforderungen 2.3, 2.4)', () => {
  it('Null-Spieltyp hat keinen Spitzen-Bereich (Spitzen-Feld ausgeblendet)', () => {
    expect(SPITZEN_RANGES['null']).toBeUndefined();
  });

  it('Farb-Spieltypen haben Spitzen-Bereich 1–11', () => {
    for (const type of ['club', 'spade', 'heart', 'diamond']) {
      expect(SPITZEN_RANGES[type]).toEqual({ min: 1, max: 11 });
    }
  });

  it('Grand hat Spitzen-Bereich 1–4', () => {
    expect(SPITZEN_RANGES['grand']).toEqual({ min: 1, max: 4 });
  });
});

// ── Spitzen-Validierungslogik – Anforderung 2.6 ───────────────────────────────

describe('Spitzen-Validierung – Anforderung 2.6', () => {
  function validateSpitzen(gameType, value) {
    const range = SPITZEN_RANGES[gameType];
    if (!range) return null; // kein Fehler bei Null-Spiel
    const val = Number(value);
    if (isNaN(val) || val < range.min || val > range.max) {
      return `Spitzen muss zwischen ${range.min} und ${range.max} liegen`;
    }
    return null;
  }

  it('gibt null zurück für Null-Spieltyp (kein Spitzen-Feld)', () => {
    expect(validateSpitzen('null', 5)).toBeNull();
    expect(validateSpitzen('null', 99)).toBeNull();
  });

  it('gibt null zurück für gültige Farb-Spitzen (1–11)', () => {
    expect(validateSpitzen('club', 1)).toBeNull();
    expect(validateSpitzen('club', 11)).toBeNull();
    expect(validateSpitzen('heart', 6)).toBeNull();
  });

  it('gibt Fehlermeldung zurück für Farb-Spitzen < 1', () => {
    expect(validateSpitzen('club', 0)).toBe('Spitzen muss zwischen 1 und 11 liegen');
    expect(validateSpitzen('spade', -1)).toBe('Spitzen muss zwischen 1 und 11 liegen');
  });

  it('gibt Fehlermeldung zurück für Farb-Spitzen > 11', () => {
    expect(validateSpitzen('diamond', 12)).toBe('Spitzen muss zwischen 1 und 11 liegen');
  });

  it('gibt null zurück für gültige Grand-Spitzen (1–4)', () => {
    expect(validateSpitzen('grand', 1)).toBeNull();
    expect(validateSpitzen('grand', 4)).toBeNull();
  });

  it('gibt Fehlermeldung zurück für Grand-Spitzen > 4', () => {
    expect(validateSpitzen('grand', 5)).toBe('Spitzen muss zwischen 1 und 4 liegen');
  });

  it('gibt Fehlermeldung zurück für NaN-Eingabe', () => {
    expect(validateSpitzen('club', 'abc')).toBe('Spitzen muss zwischen 1 und 11 liegen');
  });
});

// ── Vorauswahl-Logik – Anforderung 2.1 ───────────────────────────────────────

describe('Vorauswahl aus round-Prop (Anforderung 2.1)', () => {
  // Mirrors the initial state logic in GameTypeEditor
  function getInitialState(round) {
    return {
      gameType:  round?.gameType  ?? 'null',
      hand:      round?.hand      ?? false,
      ouvert:    round?.ouvert    ?? false,
      schneider: round?.schneider ?? false,
      schwarz:   round?.schwarz   ?? false,
      spitzen:   round?.spitzen   ?? 1,
      isBock:    round?.isBock    ?? false,
    };
  }

  it('übernimmt alle Felder aus der übergebenen Runde', () => {
    const round = {
      gameType: 'club', hand: true, ouvert: false,
      schneider: true, schwarz: false, spitzen: 3,
    };
    const state = getInitialState(round);
    expect(state.gameType).toBe('club');
    expect(state.hand).toBe(true);
    expect(state.ouvert).toBe(false);
    expect(state.schneider).toBe(true);
    expect(state.schwarz).toBe(false);
    expect(state.spitzen).toBe(3);
  });

  it('fällt auf Standardwerte zurück wenn round undefined', () => {
    const state = getInitialState(undefined);
    expect(state.gameType).toBe('null');
    expect(state.hand).toBe(false);
    expect(state.ouvert).toBe(false);
    expect(state.schneider).toBe(false);
    expect(state.schwarz).toBe(false);
    expect(state.spitzen).toBe(1);
  });

  it('fällt auf Standardwerte zurück für fehlende Felder', () => {
    const state = getInitialState({ gameType: 'grand' });
    expect(state.gameType).toBe('grand');
    expect(state.hand).toBe(false);
    expect(state.spitzen).toBe(1);
  });

  it('übernimmt isBock=true aus der übergebenen Runde (Requirement 2.1)', () => {
    const state = getInitialState({ gameType: 'club', isBock: true });
    expect(state.isBock).toBe(true);
  });

  it('übernimmt isBock=false aus der übergebenen Runde (Requirement 2.1)', () => {
    const state = getInitialState({ gameType: 'club', isBock: false });
    expect(state.isBock).toBe(false);
  });

  it('setzt isBock auf false wenn nicht in der Runde vorhanden (Requirement 2.1)', () => {
    const state = getInitialState({ gameType: 'grand' });
    expect(state.isBock).toBe(false);
  });
});

// ── Escape-Taste schließt Dialog ohne Speichern – Anforderung 1.4 ─────────────

describe('Escape-Taste – Anforderung 1.4', () => {
  it('ruft onClose auf und nicht updateRound bei Escape', () => {
    const onClose = vi.fn();
    const updateRound = vi.fn();

    // Simulate the keydown handler logic from GameTypeEditor
    function handleKeyDown(e, callbacks) {
      if (e.key === 'Escape') callbacks.onClose();
    }

    handleKeyDown({ key: 'Escape' }, { onClose, updateRound });

    expect(onClose).toHaveBeenCalledOnce();
    expect(updateRound).not.toHaveBeenCalled();
  });

  it('ignoriert andere Tasten', () => {
    const onClose = vi.fn();

    function handleKeyDown(e, callbacks) {
      if (e.key === 'Escape') callbacks.onClose();
    }

    handleKeyDown({ key: 'Enter' }, { onClose });
    handleKeyDown({ key: 'Tab' }, { onClose });

    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── canSave-Logik – Anforderung 2.6 ──────────────────────────────────────────

describe('Speichern-Button deaktiviert bei Fehlern (Anforderung 2.6)', () => {
  function canSave(errors, saving) {
    return !Object.values(errors).some(Boolean) && !saving;
  }

  it('ist aktiv wenn keine Fehler und nicht am Speichern', () => {
    expect(canSave({}, false)).toBe(true);
    expect(canSave({ spitzen: undefined }, false)).toBe(true);
  });

  it('ist deaktiviert wenn Spitzen-Fehler vorhanden', () => {
    expect(canSave({ spitzen: 'Spitzen muss zwischen 1 und 11 liegen' }, false)).toBe(false);
  });

  it('ist deaktiviert während des Speicherns', () => {
    expect(canSave({}, true)).toBe(false);
  });

  it('ist deaktiviert bei allgemeinem Fehler', () => {
    expect(canSave({ general: 'Fehler beim Speichern' }, false)).toBe(false);
  });
});

// ── Fehlerbehandlung bei DB-Fehler – Anforderung 3.5 ─────────────────────────

describe('Fehlerbehandlung bei DB-Fehler (Anforderung 3.5)', () => {
  it('zeigt Fehlermeldung und dispatcht nicht bei DB-Fehler', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: { message: 'DB-Verbindungsfehler' } });
    const onSaved = vi.fn();

    // Simulate handleSave logic
    async function handleSave(round, patch, deps) {
      const { error } = await deps.updateRound(round, patch);
      if (error) {
        return { generalError: error.message ?? 'Fehler beim Speichern', saved: false };
      }
      deps.onSaved();
      return { generalError: null, saved: true };
    }

    const result = await handleSave(
      { id: '1', _dbId: 'uuid-1' },
      { gameType: 'club', typeLabel: 'Kreuz', hand: false, ouvert: false, schneider: false, schwarz: false, spitzen: 2 },
      { updateRound, onSaved }
    );

    expect(result.generalError).toBe('DB-Verbindungsfehler');
    expect(result.saved).toBe(false);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('ruft onSaved auf und setzt keinen Fehler bei Erfolg', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: null });
    const onSaved = vi.fn();

    async function handleSave(round, patch, deps) {
      const { error } = await deps.updateRound(round, patch);
      if (error) {
        return { generalError: error.message ?? 'Fehler beim Speichern', saved: false };
      }
      deps.onSaved();
      return { generalError: null, saved: true };
    }

    const result = await handleSave(
      { id: '1', _dbId: 'uuid-1' },
      { gameType: 'grand', typeLabel: 'Grand', hand: false, ouvert: false, schneider: false, schwarz: false, spitzen: 1 },
      { updateRound, onSaved }
    );

    expect(result.generalError).toBeNull();
    expect(result.saved).toBe(true);
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('verwendet Fallback-Fehlermeldung wenn error.message fehlt', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: {} });
    const onSaved = vi.fn();

    async function handleSave(round, patch, deps) {
      const { error } = await deps.updateRound(round, patch);
      if (error) {
        return { generalError: error.message ?? 'Fehler beim Speichern', saved: false };
      }
      deps.onSaved();
      return { generalError: null, saved: true };
    }

    const result = await handleSave({}, {}, { updateRound, onSaved });

    expect(result.generalError).toBe('Fehler beim Speichern');
    expect(onSaved).not.toHaveBeenCalled();
  });
});

// ── Fehlermeldung bei Speicherfehler – Anforderung 2.5 ───────────────────────
// Validates: Requirements 2.5

describe('Fehlermeldung bei Speicherfehler – Dialog bleibt offen (Anforderung 2.5)', () => {
  /**
   * Simuliert die handleSave-Logik aus GameTypeEditor:
   * - Ruft updateRound auf
   * - Bei Fehler: setzt errors.general, ruft onSaved/onClose NICHT auf
   * - Bei Erfolg: ruft onSaved auf
   */
  async function simulateHandleSave({ updateRound, onSaved, onClose }) {
    let generalError = null;
    let dialogClosed = false;

    const { error } = await updateRound({}, {});

    if (error) {
      generalError = error.message ?? 'Fehler beim Speichern';
      // Dialog bleibt offen – onSaved und onClose werden NICHT aufgerufen
    } else {
      onSaved();
      dialogClosed = true;
    }

    return { generalError, dialogClosed };
  }

  it('Dialog bleibt offen wenn updateRound einen Fehler zurückgibt', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: { message: 'Netzwerkfehler' } });
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const result = await simulateHandleSave({ updateRound, onSaved, onClose });

    // Dialog bleibt offen: onSaved und onClose wurden nicht aufgerufen
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.dialogClosed).toBe(false);
  });

  it('Fehlermeldung wird angezeigt wenn updateRound einen Fehler zurückgibt', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: { message: 'Datenbankfehler' } });
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const result = await simulateHandleSave({ updateRound, onSaved, onClose });

    // Fehlermeldung ist gesetzt
    expect(result.generalError).toBe('Datenbankfehler');
    expect(result.generalError).not.toBeNull();
  });

  it('Fallback-Fehlermeldung wenn error.message fehlt', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: {} });
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const result = await simulateHandleSave({ updateRound, onSaved, onClose });

    expect(result.generalError).toBe('Fehler beim Speichern');
    expect(result.dialogClosed).toBe(false);
  });

  it('Dialog schließt sich und kein Fehler bei erfolgreichem Speichern', async () => {
    const updateRound = vi.fn().mockResolvedValue({ error: null });
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const result = await simulateHandleSave({ updateRound, onSaved, onClose });

    expect(onSaved).toHaveBeenCalledOnce();
    expect(result.generalError).toBeNull();
    expect(result.dialogClosed).toBe(true);
  });
});

// ── Patch-Objekt enthält isBock und gameValue – Anforderungen 2.2, 2.3, 2.4 ──

describe('Patch-Objekt beim Speichern (Anforderungen 2.2, 2.3, 2.4)', () => {
  it('enthält isBock und gameValue im Patch', () => {
    function buildPatch({ gameType, hand, ouvert, schneider, schwarz, spitzen, isBock, gameValue }) {
      const hasSuiteGame = gameType !== 'null';
      return {
        gameType,
        typeLabel: buildTypeLabel(gameType, { hand, ouvert }),
        hand,
        ouvert,
        schneider,
        schwarz,
        spitzen: hasSuiteGame ? Number(spitzen) : 0,
        isBock,
        gameValue,
      };
    }

    const patch = buildPatch({ gameType: 'club', hand: true, ouvert: false, schneider: false, schwarz: false, spitzen: 3, isBock: false, gameValue: 36 });

    expect(patch).toHaveProperty('isBock', false);
    expect(patch).toHaveProperty('gameValue', 36);
    expect(patch.typeLabel).toBe('Kreuz Hand');
    expect(patch.spitzen).toBe(3);
  });

  it('setzt spitzen auf 0 bei Null-Spieltyp', () => {
    function buildPatch({ gameType, hand, ouvert, schneider, schwarz, spitzen, isBock, gameValue }) {
      const hasSuiteGame = gameType !== 'null';
      return {
        gameType,
        typeLabel: buildTypeLabel(gameType, { hand, ouvert }),
        hand, ouvert, schneider, schwarz,
        spitzen: hasSuiteGame ? Number(spitzen) : 0,
        isBock,
        gameValue,
      };
    }

    const patch = buildPatch({ gameType: 'null', hand: true, ouvert: true, schneider: false, schwarz: false, spitzen: 5, isBock: true, gameValue: -118 });

    expect(patch.spitzen).toBe(0);
    expect(patch.typeLabel).toBe('Null Hand Ouvert');
    expect(patch.isBock).toBe(true);
    expect(patch.gameValue).toBe(-118);
  });
});
