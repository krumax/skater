// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfileData } from './useProfileData';

// Mock supabaseClient
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock syncService
vi.mock('../lib/syncService', () => ({
  loadMyRoundsAcrossSessions: vi.fn(),
}));

// Mock playerStats
vi.mock('../lib/playerStats', () => ({
  computeProfileStats: vi.fn(() => ({
    totalDeclarerGames: 5,
    totalPoints: 120,
    winRate: 60.0,
    typeDistribution: [],
    pointsOverTime: [],
  })),
  computePerSessionStats: vi.fn(() => []),
}));

import { supabase } from '../lib/supabaseClient';
import * as syncService from '../lib/syncService';

describe('useProfileData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets loading state during fetch', async () => {
    // Simulate an authenticated user
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    });

    // Make loadMyRoundsAcrossSessions hang until we resolve it
    let resolveLoad;
    syncService.loadMyRoundsAcrossSessions.mockImplementation(
      () => new Promise((resolve) => { resolveLoad = resolve; })
    );

    const { result } = renderHook(() => useProfileData());

    // Initially loading should be true (hook starts in loading state)
    expect(result.current.loading).toBe(true);

    // Wait for the load function to be called (after getSession resolves)
    await waitFor(() => {
      expect(syncService.loadMyRoundsAcrossSessions).toHaveBeenCalled();
    });

    // Still loading because the promise hasn't resolved
    expect(result.current.loading).toBe(true);

    // Resolve the fetch
    await act(async () => {
      resolveLoad({ data: [], error: null });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('sets error state when loadMyRoundsAcrossSessions rejects', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    });

    syncService.loadMyRoundsAcrossSessions.mockRejectedValue(
      new Error('Netzwerkfehler')
    );

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Netzwerkfehler');
    expect(result.current.stats).toBeNull();
  });

  it('reload triggers a new fetch', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
    });

    syncService.loadMyRoundsAcrossSessions.mockResolvedValue({
      data: [],
      error: null,
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(syncService.loadMyRoundsAcrossSessions).toHaveBeenCalledTimes(1);

    // Trigger reload
    await act(async () => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(syncService.loadMyRoundsAcrossSessions).toHaveBeenCalledTimes(2);
    });
  });

  it('returns empty stats when userId is null (no authenticated user)', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useProfileData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.sessionSummaries).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(syncService.loadMyRoundsAcrossSessions).not.toHaveBeenCalled();
  });
});
