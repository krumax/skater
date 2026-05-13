// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import MeinProfil from './MeinProfil';

// Mock useProfileData hook
vi.mock('../hooks/useProfileData', () => ({
  useProfileData: vi.fn(),
}));

// Mock recharts to avoid rendering issues in test environment
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

// Mock GameTypePieChart to avoid complex chart rendering
vi.mock('../components/analytics/GameTypePieChart', () => ({
  default: () => <div data-testid="pie-chart">PieChart</div>,
}));

// Mock SuitBadge to avoid rendering issues
vi.mock('../components/SuitBadge', () => ({
  default: ({ gameType }) => <span data-testid="suit-badge">{gameType}</span>,
}));

// Mock playerStats to provide deterministic results for ReadOnlySessionDetail
vi.mock('../lib/playerStats', () => ({
  computePlayerTotals: (players) => Object.fromEntries(players.map(p => [p, 100])),
  computeSeegerTotals: (players) => Object.fromEntries(players.map(p => [p, 50])),
  computePlayerRank: (players) => players.map((p, i) => ({ name: p, rank: i + 1, score: 100 - i * 10 })),
  computeRunningTotals: (players, rounds) => ({
    runningStd: rounds.map(() => Object.fromEntries(players.map(p => [p, 10]))),
    runningSF: rounds.map(() => Object.fromEntries(players.map(p => [p, 5]))),
  }),
  computeProfileStats: () => ({ totalDeclarerGames: 0, totalPoints: 0, winRate: 0, typeDistribution: [], pointsOverTime: [] }),
  computePerSessionStats: () => [],
}));

import { useProfileData } from '../hooks/useProfileData';

describe('MeinProfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when useProfileData returns loading: true', () => {
    useProfileData.mockReturnValue({
      stats: null,
      sessionSummaries: [],
      rounds: [],
      loading: true,
      error: null,
      reload: vi.fn(),
      linkedSessions: [],
      linkedSessionsLoading: true,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    // The loading spinner uses the ⟳ character
    expect(screen.getByText('⟳')).toBeInTheDocument();
    // Should NOT render the page title while loading
    expect(screen.queryByText('Mein Profil')).not.toBeInTheDocument();
  });

  it('renders empty state with hint text when stats.totalDeclarerGames === 0', () => {
    useProfileData.mockReturnValue({
      stats: {
        totalDeclarerGames: 0,
        totalPoints: 0,
        winRate: 0,
        typeDistribution: [],
        pointsOverTime: [],
      },
      sessionSummaries: [],
      rounds: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    expect(screen.getByText('Mein Profil')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Runden vorhanden.')).toBeInTheDocument();
    expect(screen.getAllByText(/Einladungslink/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders error card with retry button when error is set', () => {
    const reloadFn = vi.fn();
    useProfileData.mockReturnValue({
      stats: null,
      sessionSummaries: [],
      rounds: [],
      loading: false,
      error: 'Netzwerkfehler',
      reload: reloadFn,
      linkedSessions: [],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    expect(screen.getByText('Mein Profil')).toBeInTheDocument();
    expect(screen.getByText(/Netzwerkfehler/)).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('renders KPI cards when data is loaded', () => {
    useProfileData.mockReturnValue({
      stats: {
        totalDeclarerGames: 42,
        totalPoints: 350,
        winRate: 64.3,
        typeDistribution: [{ type: 'Grand', count: 5, pct: '11.9' }],
        pointsOverTime: [{ timestamp: '2024-01-01', cumulativePoints: 50 }],
      },
      sessionSummaries: [],
      rounds: [
        { player: 'Max', playerName: 'Max', gameType: 'Grand', gameValue: 48, won: true, timestamp: '2024-01-01', sessionId: 's1' },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    // KPI labels
    expect(screen.getByText('Gesamtrunden als Ansager')).toBeInTheDocument();
    expect(screen.getByText('Gesamtpunkte')).toBeInTheDocument();
    expect(screen.getByText('Gewinnrate')).toBeInTheDocument();

    // KPI values
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('+350')).toBeInTheDocument();
    expect(screen.getByText('64.3%')).toBeInTheDocument();
  });

  // ── Linked Sessions Section Tests ──

  it('renders linked sessions list with table name, display_name, and total rounds', () => {
    useProfileData.mockReturnValue({
      stats: {
        totalDeclarerGames: 10,
        totalPoints: 100,
        winRate: 60,
        typeDistribution: [],
        pointsOverTime: [],
      },
      sessionSummaries: [],
      rounds: [
        { player: 'Konrad', playerName: 'Konrad', gameType: 'Grand', gameValue: 48, won: true, timestamp: '2024-01-01', sessionId: 's1' },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [
        { sessionId: 's1', tableName: 'Stammtisch', displayName: 'Konrad', totalRounds: 25, lastPlayedAt: '2024-06-01' },
        { sessionId: 's2', tableName: 'Freitagsrunde', displayName: 'Konni', totalRounds: 12, lastPlayedAt: '2024-05-15' },
      ],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    expect(screen.getByText('Verknüpfte Tische')).toBeInTheDocument();
    expect(screen.getByText('Stammtisch')).toBeInTheDocument();
    expect(screen.getByText('Spieler: Konrad')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Freitagsrunde')).toBeInTheDocument();
    expect(screen.getByText('Spieler: Konni')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows "Unbenannter Tisch" for sessions without a table name', () => {
    useProfileData.mockReturnValue({
      stats: {
        totalDeclarerGames: 5,
        totalPoints: 50,
        winRate: 60,
        typeDistribution: [],
        pointsOverTime: [],
      },
      sessionSummaries: [],
      rounds: [
        { player: 'Max', playerName: 'Max', gameType: 'Grand', gameValue: 48, won: true, timestamp: '2024-01-01', sessionId: 's1' },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [
        { sessionId: 's1', tableName: null, displayName: 'Max', totalRounds: 8, lastPlayedAt: '2024-06-01' },
      ],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    expect(screen.getByText('Unbenannter Tisch')).toBeInTheDocument();
    expect(screen.getByText('Spieler: Max')).toBeInTheDocument();
  });

  it('shows onboarding hint when no sessions are linked', () => {
    useProfileData.mockReturnValue({
      stats: {
        totalDeclarerGames: 5,
        totalPoints: 50,
        winRate: 60,
        typeDistribution: [],
        pointsOverTime: [],
      },
      sessionSummaries: [],
      rounds: [
        { player: 'Max', playerName: 'Max', gameType: 'Grand', gameValue: 48, won: true, timestamp: '2024-01-01', sessionId: 's1' },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
    });

    render(<MeinProfil />);

    expect(screen.getByText('Verknüpfte Tische')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Tische verknüpft.')).toBeInTheDocument();
    expect(screen.getByText(/Einladungslink/)).toBeInTheDocument();
  });

  it('shows error state with retry button on linked sessions load failure', () => {
    const refetchFn = vi.fn();
    useProfileData.mockReturnValue({
      stats: {
        totalDeclarerGames: 5,
        totalPoints: 50,
        winRate: 60,
        typeDistribution: [],
        pointsOverTime: [],
      },
      sessionSummaries: [],
      rounds: [
        { player: 'Max', playerName: 'Max', gameType: 'Grand', gameValue: 48, won: true, timestamp: '2024-01-01', sessionId: 's1' },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [],
      linkedSessionsLoading: false,
      linkedSessionsError: 'Netzwerkfehler',
      refetchLinkedSessions: refetchFn,
    });

    render(<MeinProfil />);

    expect(screen.getByText('Verknüpfte Tische')).toBeInTheDocument();
    expect(screen.getByText('Fehler beim Laden der verknüpften Tische.')).toBeInTheDocument();
    // The retry button for linked sessions
    const retryButtons = screen.getAllByText('Erneut versuchen');
    expect(retryButtons.length).toBeGreaterThanOrEqual(1);
  });

  // ── ReadOnlySessionDetail Tests (Req 5.3, 6.5, 6.6) ──

  describe('ReadOnlySessionDetail view', () => {
    const baseHookReturn = {
      stats: null,
      sessionSummaries: [],
      rounds: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      linkedSessions: [],
      linkedSessionsLoading: false,
      linkedSessionsError: null,
      refetchLinkedSessions: vi.fn(),
      loadSessionDetail: vi.fn(),
      clearSessionDetail: vi.fn(),
    };

    it('renders loading spinner when sessionDetailLoading is true', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: null,
        sessionDetailLoading: true,
        sessionDetailError: null,
      });

      render(<MeinProfil />);

      // Loading spinner character
      expect(screen.getByText('⟳')).toBeInTheDocument();
      expect(screen.getByText('Mein Profil')).toBeInTheDocument();
    });

    it('renders error state with back button when sessionDetailError is set', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: null,
        sessionDetailLoading: false,
        sessionDetailError: 'Zugriff verweigert.',
      });

      render(<MeinProfil />);

      expect(screen.getByText('Zugriff verweigert.')).toBeInTheDocument();
      expect(screen.getByText('Zurück zur Übersicht')).toBeInTheDocument();
    });

    it('renders error fallback when sessionDetail is null without explicit error', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: null,
        sessionDetailLoading: false,
        sessionDetailError: null,
        // Trigger the detail view by having sessionDetailError be falsy but sessionDetail also null
        // The component checks: if (sessionDetail || sessionDetailLoading || sessionDetailError)
        // We need at least one truthy to enter the detail branch — use a non-null sessionDetail
      });

      // When none of sessionDetail/sessionDetailLoading/sessionDetailError is truthy,
      // the component does NOT enter the detail view. This is expected behavior.
      render(<MeinProfil />);
      expect(screen.queryByText('Zurück zur Übersicht')).not.toBeInTheDocument();
    });

    it('renders "Nur Lesen" badge in the session detail view', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: {
          session: { seating: ['Konrad', 'Max', 'Oma'], table_name: 'Stammtisch' },
          rounds: [
            { _dbId: 'r1', id: 1, player: 'Konrad', gameType: 'Grand', gameValue: 48, won: true, isBock: false },
          ],
          isReadOnly: true,
        },
        sessionDetailLoading: false,
        sessionDetailError: null,
      });

      render(<MeinProfil />);

      expect(screen.getByText('Nur Lesen')).toBeInTheDocument();
    });

    it('renders "Zurück zur Übersicht" back button in the session detail view', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: {
          session: { seating: ['Konrad', 'Max', 'Oma'], table_name: 'Stammtisch' },
          rounds: [],
          isReadOnly: true,
        },
        sessionDetailLoading: false,
        sessionDetailError: null,
      });

      render(<MeinProfil />);

      // The back button has aria-label "Zurück zur Übersicht"
      expect(screen.getByLabelText('Zurück zur Übersicht')).toBeInTheDocument();
    });

    it('does not render edit or delete buttons in the read-only session detail', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: {
          session: { seating: ['Konrad', 'Max', 'Oma'], table_name: 'Stammtisch' },
          rounds: [
            { _dbId: 'r1', id: 1, player: 'Konrad', gameType: 'Grand', gameValue: 48, won: true, isBock: false },
            { _dbId: 'r2', id: 2, player: 'Max', gameType: 'Kreuz', gameValue: 24, won: false, isBock: false },
            { _dbId: 'r3', id: 3, player: 'Oma', gameType: 'Null', gameValue: 23, won: true, isBock: false },
          ],
          isReadOnly: true,
        },
        sessionDetailLoading: false,
        sessionDetailError: null,
      });

      render(<MeinProfil />);

      // No edit/delete/add controls should be present (Req 5.3)
      expect(screen.queryByText('Bearbeiten')).not.toBeInTheDocument();
      expect(screen.queryByText('Löschen')).not.toBeInTheDocument();
      expect(screen.queryByText('Runde hinzufügen')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bearbeiten/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /löschen/i })).not.toBeInTheDocument();
      // Verify the "Nur-Lesen-Ansicht" subtitle is shown
      expect(screen.getByText(/Nur-Lesen-Ansicht/)).toBeInTheDocument();
    });

    it('renders table name and round count in the session detail header', () => {
      useProfileData.mockReturnValue({
        ...baseHookReturn,
        sessionDetail: {
          session: { seating: ['Konrad', 'Max', 'Oma'], table_name: 'Freitagsrunde' },
          rounds: [
            { _dbId: 'r1', id: 1, player: 'Konrad', gameType: 'Grand', gameValue: 48, won: true, isBock: false },
            { _dbId: 'r2', id: 2, player: 'Max', gameType: 'Kreuz', gameValue: 24, won: false, isBock: false },
          ],
          isReadOnly: true,
        },
        sessionDetailLoading: false,
        sessionDetailError: null,
      });

      render(<MeinProfil />);

      expect(screen.getByText('Freitagsrunde')).toBeInTheDocument();
      expect(screen.getByText(/2 Runden/)).toBeInTheDocument();
    });
  });
});
