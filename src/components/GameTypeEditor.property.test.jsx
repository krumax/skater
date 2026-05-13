// @vitest-environment jsdom
// Feature: game-type-editing, Property 2: Dialog öffnet korrekte Runde
// Validates: Anforderungen 1.2, 2.1

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';
import GameTypeEditor, { GAME_TYPES } from './GameTypeEditor.jsx';

// ── Mock GameContext ──────────────────────────────────────────────────────────

vi.mock('../context/GameContext.jsx', () => ({
  useGame: () => ({
    updateRound: vi.fn().mockResolvedValue({ error: null }),
    players: ['Alice', 'Bob', 'Charlie'],
  }),
}));

vi.mock('../hooks/useSuitLabel', () => ({
  useSuitLabel: () => (gameType) => {
    const labels = { null: 'Null', club: 'Kreuz', spade: 'Pik', heart: 'Herz', diamond: 'Karo', grand: 'Grand' };
    return labels[gameType] ?? gameType;
  },
}));

// ── Label-Mapping (muss mit SUIT_LABELS in skatScoring.js übereinstimmen) ─────

const SUIT_LABELS_MAP = {
  null:    'Null',
  club:    'Kreuz',
  spade:   'Pik',
  heart:   'Herz',
  diamond: 'Karo',
  grand:   'Grand',
};

// ── Property 5: GameTypeEditor-Vorbeleg ist korrekt ──────────────────────────
// Feature: bockrunden, Property 5: GameTypeEditor-Vorbeleg ist korrekt
// Validates: Requirements 2.1

/**
 * Minimal round shape for Property 5 - only isBock matters here.
 * We include the minimum fields required to render the component without errors.
 */
const arbitraryRoundWithBock = fc.record({
  id:          fc.integer({ min: 1, max: 500 }),
  roundNumber: fc.integer({ min: 1, max: 500 }),
  gameType:    fc.constantFrom(...GAME_TYPES),
  hand:        fc.boolean(),
  ouvert:      fc.boolean(),
  schneider:   fc.boolean(),
  schwarz:     fc.boolean(),
  spitzen:     fc.integer({ min: 1, max: 11 }),
  isBock:      fc.boolean(),
  _dbId:       fc.uuid(),
});

describe('Property 5: GameTypeEditor-Vorbeleg ist korrekt (Requirements 2.1)', () => {
  beforeEach(() => {
    cleanup();
  });

  it('Bockrunde-Checkbox ist vorbelegt mit round.isBock', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(arbitraryRoundWithBock, (round) => {
        cleanup();

        render(
          <GameTypeEditor
            round={round}
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        );

        // The "Bockrunde" checkbox must reflect the round's isBock value
        const bockCheckbox = screen.getByLabelText('Bockrunde');
        expect(bockCheckbox.checked).toBe(round.isBock);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Arbitrary: gültige Runde ──────────────────────────────────────────────────

const arbitraryGameType = fc.constantFrom(...GAME_TYPES);

const arbitraryRound = fc.record({
  id:          fc.integer({ min: 1, max: 500 }),
  gameType:    arbitraryGameType,
  hand:        fc.boolean(),
  ouvert:      fc.boolean(),
  schneider:   fc.boolean(),
  schwarz:     fc.boolean(),
  spitzen:     fc.integer({ min: 1, max: 11 }),
  roundNumber: fc.integer({ min: 1, max: 500 }),
  _dbId:       fc.uuid(),
}).map(round => ({
  ...round,
  // Grand erlaubt max 4 Spitzen - auf gültigen Bereich begrenzen
  spitzen: round.gameType === 'grand' ? Math.min(round.spitzen, 4) : round.spitzen,
}));

// ── Property 2 ────────────────────────────────────────────────────────────────

describe('Property 2: Dialog öffnet korrekte Runde (Anforderungen 1.2, 2.1)', () => {
  beforeEach(() => {
    cleanup();
  });

  it('Formularfelder entsprechen den Werten der übergebenen Runde', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(arbitraryRound, (round) => {
        cleanup();

        render(
          <GameTypeEditor
            round={round}
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        );

        const isNullGame = round.gameType === 'null';
        const expectedLabel = SUIT_LABELS_MAP[round.gameType];

        // ── Alle 6 Spieltyp-Chips sind vorhanden ──
        const allLabels = Object.values(SUIT_LABELS_MAP);
        const buttons = screen.getAllByRole('button');
        const gameTypeButtons = buttons.filter(b =>
          allLabels.some(label => b.textContent.includes(label))
        );
        expect(gameTypeButtons.length).toBe(6);

        // ── Aktiver Chip entspricht round.gameType ──
        const activeChip = gameTypeButtons.find(b =>
          b.style.background !== '' && b.style.background !== 'transparent'
        );
        expect(activeChip).toBeDefined();
        expect(activeChip.textContent).toContain(expectedLabel);

        // ── Hand-Checkbox ──
        const handCheckbox = screen.getByLabelText('Hand');
        expect(handCheckbox.checked).toBe(round.hand);

        // ── Ouvert-Checkbox ──
        const ouvertCheckbox = screen.getByLabelText('Ouvert');
        expect(ouvertCheckbox.checked).toBe(round.ouvert);

        if (!isNullGame) {
          // ── Schneider-Checkbox (nur bei Farb-/Grand-Spielen aktiv) ──
          const schneiderCheckbox = screen.getByLabelText('Schneider');
          expect(schneiderCheckbox.checked).toBe(round.schneider);
          expect(schneiderCheckbox.disabled).toBe(false);

          // ── Schwarz-Checkbox (nur bei Farb-/Grand-Spielen aktiv) ──
          const schwarzCheckbox = screen.getByLabelText('Schwarz');
          expect(schwarzCheckbox.checked).toBe(round.schwarz);
          expect(schwarzCheckbox.disabled).toBe(false);

          // ── Spitzen-Auswahl (Buttons 1–11 bei Farb-/Grand-Spielen) ──
          // Grand erlaubt max 4 Spitzen - Komponente zeigt nur 1–4 aktiv
          const maxSpitzen = round.gameType === 'grand' ? 4 : 11;
          const expectedSpitzen = Math.min(round.spitzen, maxSpitzen);
          const spitzenButtons = screen.getAllByRole('button').filter(b =>
            /^\d+$/.test(b.textContent?.trim())
          );
          expect(spitzenButtons.length).toBeGreaterThan(0);
          const activeSpitzen = spitzenButtons.find(b => b.style.background && b.style.background !== 'transparent');
          expect(activeSpitzen).toBeDefined();
          expect(Number(activeSpitzen.textContent.trim())).toBe(expectedSpitzen);
        } else {
          // ── Null-Spiel: Schneider und Schwarz sind disabled (nicht versteckt) ──
          const schneiderCheckbox = screen.queryByLabelText('Schneider');
          expect(schneiderCheckbox).not.toBeNull();
          expect(schneiderCheckbox.disabled).toBe(true);

          const schwarzCheckbox = screen.queryByLabelText('Schwarz');
          expect(schwarzCheckbox).not.toBeNull();
          expect(schwarzCheckbox.disabled).toBe(true);

          // Spitzen-Buttons sind bei Null im DOM, aber disabled/inaktiv
          const spitzenButtons = screen.getAllByRole('button').filter(b =>
            /^\d+$/.test(b.textContent?.trim())
          );
          // Kein aktiver Spitzen-Button bei Null
          const activeSpitzen = spitzenButtons.find(b => b.style.background && b.style.background !== 'transparent');
          expect(activeSpitzen).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});
