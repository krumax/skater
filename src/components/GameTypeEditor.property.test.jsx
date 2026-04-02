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
  }),
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

// ── Arbitrary: gültige Runde ──────────────────────────────────────────────────

const arbitraryGameType = fc.constantFrom(...GAME_TYPES);

const arbitraryRound = fc.record({
  id:          fc.integer({ min: 1, max: 500 }),
  gameType:    arbitraryGameType,
  hand:        fc.boolean(),
  ouvert:      fc.boolean(),
  schneider:   fc.boolean(),
  schwarz:     fc.boolean(),
  // spitzen: 1–11 covers all game types (grand max is 4, but component clamps via validation)
  spitzen:     fc.integer({ min: 1, max: 11 }),
  roundNumber: fc.integer({ min: 1, max: 500 }),
  _dbId:       fc.uuid(),
});

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
        const gameTypeButtons = buttons.filter(b => allLabels.includes(b.textContent));
        expect(gameTypeButtons.length).toBe(6);

        // ── Aktiver Chip entspricht round.gameType ──
        // chipActiveStyle setzt background: 'var(--accent, #cba6f7)' als inline-style.
        // In jsdom wird der Wert als literaler String gesetzt.
        const activeChip = gameTypeButtons.find(b =>
          b.style.background !== '' && b.style.background !== 'transparent'
        );
        expect(activeChip).toBeDefined();
        expect(activeChip.textContent).toBe(expectedLabel);

        // ── Hand-Checkbox ──
        const handCheckbox = screen.getByLabelText('Hand');
        expect(handCheckbox.checked).toBe(round.hand);

        // ── Ouvert-Checkbox ──
        const ouvertCheckbox = screen.getByLabelText('Ouvert');
        expect(ouvertCheckbox.checked).toBe(round.ouvert);

        if (!isNullGame) {
          // ── Schneider-Checkbox (nur bei Farb-/Grand-Spielen) ──
          const schneiderCheckbox = screen.getByLabelText('Schneider');
          expect(schneiderCheckbox.checked).toBe(round.schneider);

          // ── Schwarz-Checkbox (nur bei Farb-/Grand-Spielen) ──
          const schwarzCheckbox = screen.getByLabelText('Schwarz');
          expect(schwarzCheckbox.checked).toBe(round.schwarz);

          // ── Spitzen-Eingabefeld (nur bei Farb-/Grand-Spielen) ──
          const spitzenInput = screen.getByRole('spinbutton');
          expect(Number(spitzenInput.value)).toBe(round.spitzen);
        } else {
          // ── Null-Spiel: Schneider, Schwarz und Spitzen sind ausgeblendet ──
          expect(screen.queryByLabelText('Schneider')).toBeNull();
          expect(screen.queryByLabelText('Schwarz')).toBeNull();
          expect(screen.queryByRole('spinbutton')).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });
});
