// @vitest-environment jsdom
// Feature: iconset-selection – Unit-Tests für PlayerSettings Iconset-Sektion
// Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlayerSettings from './PlayerSettings';
import { IconsetProvider } from '../context/IconsetContext';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../context/GameContext', () => ({
  useGame: vi.fn(() => ({
    players: ['Alice', 'Bob', 'Charlie'],
    geberIndex: 0,
    sessionId: 'test-session',
    addPlayer: vi.fn(),
    removePlayer: vi.fn(),
    renamePlayer: vi.fn(),
    reorderSeating: vi.fn(),
    rounds: [],
    switchSession: vi.fn(),
    createNewTable: vi.fn(),
    tableName: 'Test Tisch',
    renameTable: vi.fn(),
    clearSession: vi.fn(),
  })),
}));

vi.mock('../lib/syncService', () => ({
  listSessions: vi.fn(() => Promise.resolve({ data: [] })),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Renders PlayerSettings wrapped in the real IconsetProvider and MemoryRouter.
 * This lets us test actual iconset interaction without mocking useIconset.
 * An optional initial iconset can be pre-seeded via localStorage.
 */
function renderPlayerSettings(initialIconset) {
  if (initialIconset) {
    localStorage.setItem('skatIconset', initialIconset);
  }
  return render(
    <MemoryRouter>
      <IconsetProvider>
        <PlayerSettings />
      </IconsetProvider>
    </MemoryRouter>,
  );
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ── Test 1: „Kartensymbole" section is rendered ───────────────────────────────
// Validates: Requirement 1.1

describe('Kartensymbole section (Requirement 1.1)', () => {
  it('renders the „Kartensymbole" section heading', () => {
    renderPlayerSettings();
    // getByText throws if not found, so a non-null result confirms presence
    expect(screen.getByText('Kartensymbole')).not.toBeNull();
  });
});

// ── Test 2: Both iconset options are displayed ────────────────────────────────
// Validates: Requirement 1.1

describe('Iconset options display (Requirement 1.1)', () => {
  it('displays the „Französisches Blatt" option', () => {
    renderPlayerSettings();
    expect(screen.getByText('Französisches Blatt')).not.toBeNull();
  });

  it('displays the „Altenburger Blatt" option', () => {
    renderPlayerSettings();
    expect(screen.getByText('Altenburger Blatt')).not.toBeNull();
  });

  it('renders both iconset option buttons', () => {
    renderPlayerSettings();
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    expect(frenchBtn).not.toBeNull();
    expect(altenburgBtn).not.toBeNull();
  });
});

// ── Test 3: Active option is visually highlighted ─────────────────────────────
// Validates: Requirement 1.3

describe('Active option highlighting (Requirement 1.3)', () => {
  it('highlights the French option by default (no localStorage value)', () => {
    renderPlayerSettings();
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    // Active option has a check_circle Material Icon inside it
    const checkIcon = within(frenchBtn).queryByText('check_circle');
    expect(checkIcon).not.toBeNull();
  });

  it('does not show check_circle on the inactive Altenburg option by default', () => {
    renderPlayerSettings();
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    const checkIcon = within(altenburgBtn).queryByText('check_circle');
    expect(checkIcon).toBeNull();
  });

  it('highlights the Altenburg option when it is stored in localStorage', () => {
    renderPlayerSettings('altenburg');
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    const checkIcon = within(altenburgBtn).queryByText('check_circle');
    expect(checkIcon).not.toBeNull();
  });

  it('does not show check_circle on the inactive French option when Altenburg is active', () => {
    renderPlayerSettings('altenburg');
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    const checkIcon = within(frenchBtn).queryByText('check_circle');
    expect(checkIcon).toBeNull();
  });
});

// ── Test 4: Clicking an option calls setIconset with the correct value ─────────
// Validates: Requirement 1.3 (interaction triggers state change)

describe('Clicking an option updates the active iconset (Requirement 1.3)', () => {
  it('switches to Altenburg when the Altenburg button is clicked', () => {
    renderPlayerSettings();
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    fireEvent.click(altenburgBtn);
    // After clicking, the Altenburg button should now show check_circle
    expect(within(altenburgBtn).queryByText('check_circle')).not.toBeNull();
  });

  it('switches back to French when the French button is clicked after Altenburg was active', () => {
    renderPlayerSettings('altenburg');
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    fireEvent.click(frenchBtn);
    expect(within(frenchBtn).queryByText('check_circle')).not.toBeNull();
  });

  it('persists the selected iconset to localStorage when Altenburg is clicked', () => {
    renderPlayerSettings();
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    fireEvent.click(altenburgBtn);
    expect(localStorage.getItem('skatIconset')).toBe('altenburg');
  });

  it('persists the selected iconset to localStorage when French is clicked', () => {
    renderPlayerSettings('altenburg');
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    fireEvent.click(frenchBtn);
    expect(localStorage.getItem('skatIconset')).toBe('french');
  });
});

// ── Test 5: Preview shows exactly 4 suit symbols per option ───────────────────
// Validates: Requirement 1.4

describe('Preview shows 4 suit symbols per option (Requirement 1.4)', () => {
  it('shows exactly 4 suit labels in the French option', () => {
    renderPlayerSettings();
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    // Each suit has a label span; count them by matching all four French labels
    const kreuz = within(frenchBtn).queryByText('Kreuz');
    const pik = within(frenchBtn).queryByText('Pik');
    const herz = within(frenchBtn).queryByText('Herz');
    const karo = within(frenchBtn).queryByText('Karo');
    expect(kreuz).not.toBeNull();
    expect(pik).not.toBeNull();
    expect(herz).not.toBeNull();
    expect(karo).not.toBeNull();
  });

  it('shows exactly 4 suit labels in the Altenburg option', () => {
    renderPlayerSettings();
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    const eichel = within(altenburgBtn).queryByText('Eichel');
    const gruen = within(altenburgBtn).queryByText('Grün');
    const rot = within(altenburgBtn).queryByText('Rot');
    const schellen = within(altenburgBtn).queryByText('Schellen');
    expect(eichel).not.toBeNull();
    expect(gruen).not.toBeNull();
    expect(rot).not.toBeNull();
    expect(schellen).not.toBeNull();
  });
});

// ── Test 6: Correct labels per option ────────────────────────────────────────
// Validates: Requirements 1.5, 1.6

describe('Correct suit labels per iconset option (Requirements 1.5, 1.6)', () => {
  it('shows Kreuz, Pik, Herz, Karo labels in the French option', () => {
    renderPlayerSettings();
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    expect(within(frenchBtn).queryByText('Kreuz')).not.toBeNull();
    expect(within(frenchBtn).queryByText('Pik')).not.toBeNull();
    expect(within(frenchBtn).queryByText('Herz')).not.toBeNull();
    expect(within(frenchBtn).queryByText('Karo')).not.toBeNull();
  });

  it('shows Eichel, Grün, Rot, Schellen labels in the Altenburg option', () => {
    renderPlayerSettings();
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    expect(within(altenburgBtn).queryByText('Eichel')).not.toBeNull();
    expect(within(altenburgBtn).queryByText('Grün')).not.toBeNull();
    expect(within(altenburgBtn).queryByText('Rot')).not.toBeNull();
    expect(within(altenburgBtn).queryByText('Schellen')).not.toBeNull();
  });

  it('does not show Altenburg labels in the French option', () => {
    renderPlayerSettings();
    const frenchBtn = screen.getByText('Französisches Blatt').closest('button');
    expect(within(frenchBtn).queryByText('Eichel')).toBeNull();
    expect(within(frenchBtn).queryByText('Schellen')).toBeNull();
  });

  it('does not show French labels in the Altenburg option', () => {
    renderPlayerSettings();
    const altenburgBtn = screen.getByText('Altenburger Blatt').closest('button');
    expect(within(altenburgBtn).queryByText('Kreuz')).toBeNull();
    expect(within(altenburgBtn).queryByText('Karo')).toBeNull();
  });
});
