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
    });

    render(<MeinProfil />);

    expect(screen.getByText('Mein Profil')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Runden vorhanden.')).toBeInTheDocument();
    expect(screen.getByText(/Einladungslink/)).toBeInTheDocument();
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
});
