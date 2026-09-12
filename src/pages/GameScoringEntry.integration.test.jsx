// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GameScoringEntry from './GameScoringEntry';

vi.mock('../context/GameContext', () => ({
  useGame: () => ({
    players: ['Alice', 'Bob', 'Charlie'],
    seating: ['Alice', 'Bob', 'Charlie'],
    addRound: vi.fn(),
    resetRoundCounter: vi.fn(),
    roundCounter: {},
    currentRound: 1,
    playerRankStandard: [],
    currentRoles: { activePlayers: ['Alice', 'Bob', 'Charlie'], geber: 'Alice' },
    rounds: [],
    playerTotals: {},
    seegerTotals: {},
    spiellisten: [],
    activeSpiellisteId: null,
    setActiveSpielliste: vi.fn(),
    createSpielliste: vi.fn(),
    closeSpielliste: vi.fn(),
    getActiveSpiellistenForSession: () => [],
  }),
}));

vi.mock('../lib/playerLevel', () => ({
  computePlayerLevel: () => 1,
}));

vi.mock('../hooks/useGameForm', () => ({
  useGameForm: () => ({
    activePlayer: 'Alice',
    gameType: 'spade',
    hand: false,
    schneider: false,
    schneiderAnnounced: false,
    schwarz: false,
    schwarzAnnounced: false,
    ouvert: false,
    mitOhne: 'mit',
    spitzen: 1,
    eyeCount: 61,
    isBock: false,
    setActivePlayer: vi.fn(),
    setGameType: vi.fn(),
    setHand: vi.fn(),
    setSchneider: vi.fn(),
    setSchneiderAnnounced: vi.fn(),
    setSchwarz: vi.fn(),
    setSchwarzAnnounced: vi.fn(),
    setOuvert: vi.fn(),
    setMitOhne: vi.fn(),
    setSpitzen: vi.fn(),
    setEyeCount: vi.fn(),
    setIsBock: vi.fn(),
    maxSpitzen: 11,
    result: null,
    outcomeLabel: 'Gewonnen',
    isSpaltarsch: false,
    resetForm: vi.fn(),
    buildRoundPayload: vi.fn(),
  }),
}));

vi.mock('../hooks/useRoundCounter', () => ({
  useRoundCounter: () => ({
    step: 0,
    totalDeals: 0,
    completedRounds: () => 0,
    bockRoundsLeft: 0,
    reset: vi.fn(),
  }),
}));

vi.mock('../components/scoring/RolesBar', () => ({ default: () => null }));
vi.mock('../components/scoring/PlayerSelector', () => ({ default: () => null }));
vi.mock('../components/scoring/GameTypeSelector', () => ({ default: () => null }));
vi.mock('../components/scoring/ModifierChips', () => ({ default: () => null }));
vi.mock('../components/scoring/AnsageSelector', () => ({ default: () => null }));
vi.mock('../components/scoring/SpitzenSelector', () => ({ default: () => null }));
vi.mock('../components/scoring/ResultDashboard', () => ({ default: () => null }));
vi.mock('../components/ListenFortschritt', () => ({ default: () => null }));
vi.mock('../components/SpiellistenSelector', () => ({ default: () => null }));

describe('GameScoringEntry – Regelwerk-Link', () => {
  it('verlinkt vom Ablauf direkt auf den Reizen-Anker im Regelwerk', () => {
    render(
      <MemoryRouter>
        <GameScoringEntry />
      </MemoryRouter>,
    );

    const link = screen.getByText('Regelwerk').closest('a');

    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', '/info#reizen');
  });
});
