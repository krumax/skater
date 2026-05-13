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
  loadLinkedSessions: vi.fn(),
  loadSessionForClaimedPlayer: vi.fn(),
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
    syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });

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
    syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });

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
    syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });

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

  // --- linkedSessions tests (Req 6.1, 6.5, 6.6) ---

  describe('linkedSessions', () => {
    it('loads linked sessions on mount for authenticated users', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      const mockSessions = [
        { sessionId: 's1', tableName: 'Tisch A', displayName: 'Max', totalRounds: 10, lastPlayedAt: '2024-01-01T12:00:00Z' },
        { sessionId: 's2', tableName: null, displayName: 'Konrad', totalRounds: 5, lastPlayedAt: '2024-01-02T12:00:00Z' },
      ];

      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useProfileData());

      // Initially loading
      expect(result.current.linkedSessionsLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.linkedSessionsLoading).toBe(false);
      });

      expect(result.current.linkedSessions).toEqual(mockSessions);
      expect(result.current.linkedSessionsError).toBeNull();
      expect(syncService.loadLinkedSessions).toHaveBeenCalledWith('user-123');
    });

    it('sets linkedSessionsError when loadLinkedSessions returns an error', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockResolvedValue({
        data: null,
        error: { message: 'Datenbankfehler' },
      });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.linkedSessionsLoading).toBe(false);
      });

      expect(result.current.linkedSessionsError).toBe('Datenbankfehler');
      expect(result.current.linkedSessions).toEqual([]);
    });

    it('sets linkedSessionsError when loadLinkedSessions throws', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockRejectedValue(new Error('Netzwerkfehler'));

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.linkedSessionsLoading).toBe(false);
      });

      expect(result.current.linkedSessionsError).toBe('Netzwerkfehler');
      expect(result.current.linkedSessions).toEqual([]);
    });

    it('returns empty linkedSessions when not authenticated', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
      });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.linkedSessionsLoading).toBe(false);
      });

      expect(result.current.linkedSessions).toEqual([]);
      expect(result.current.linkedSessionsError).toBeNull();
      expect(syncService.loadLinkedSessions).not.toHaveBeenCalled();
    });

    it('refetchLinkedSessions triggers a new fetch', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.linkedSessionsLoading).toBe(false);
      });

      expect(syncService.loadLinkedSessions).toHaveBeenCalledTimes(1);

      // Trigger refetch
      await act(async () => {
        result.current.refetchLinkedSessions();
      });

      await waitFor(() => {
        expect(syncService.loadLinkedSessions).toHaveBeenCalledTimes(2);
      });
    });

    it('handles empty data from loadLinkedSessions gracefully', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });

      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.linkedSessionsLoading).toBe(false);
      });

      expect(result.current.linkedSessions).toEqual([]);
      expect(result.current.linkedSessionsError).toBeNull();
    });
  });

  describe('loadSessionDetail', () => {
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });
      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });
    });

    it('loads session detail successfully', async () => {
      const mockSessionData = {
        session: { id: 'session-1', seating: ['A', 'B', 'C'] },
        rounds: [],
        spiellisten: [],
        activeSpiellisteId: null,
        isReadOnly: true,
      };
      syncService.loadSessionForClaimedPlayer.mockResolvedValue({
        data: mockSessionData,
        error: null,
      });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially no session detail
      expect(result.current.sessionDetail).toBeNull();
      expect(result.current.sessionDetailLoading).toBe(false);
      expect(result.current.sessionDetailError).toBeNull();

      // Load session detail
      await act(async () => {
        await result.current.loadSessionDetail('session-1');
      });

      expect(result.current.sessionDetail).toEqual(mockSessionData);
      expect(result.current.sessionDetailLoading).toBe(false);
      expect(result.current.sessionDetailError).toBeNull();
      expect(syncService.loadSessionForClaimedPlayer).toHaveBeenCalledWith('session-1', 'user-123');
    });

    it('sets error when access is denied', async () => {
      syncService.loadSessionForClaimedPlayer.mockResolvedValue({
        data: null,
        error: { message: 'Zugriff verweigert.' },
      });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadSessionDetail('session-1');
      });

      expect(result.current.sessionDetail).toBeNull();
      expect(result.current.sessionDetailError).toBe('Zugriff verweigert.');
      expect(result.current.sessionDetailLoading).toBe(false);
    });

    it('sets error on network failure', async () => {
      syncService.loadSessionForClaimedPlayer.mockRejectedValue(
        new Error('Netzwerkfehler beim Laden der Session.')
      );

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadSessionDetail('session-1');
      });

      expect(result.current.sessionDetail).toBeNull();
      expect(result.current.sessionDetailError).toBe('Netzwerkfehler beim Laden der Session.');
      expect(result.current.sessionDetailLoading).toBe(false);
    });

    it('sets error when user is not authenticated', async () => {
      // Override getSession to return no user for the loadSessionDetail call
      supabase.auth.getSession
        .mockResolvedValueOnce({ data: { session: { user: { id: 'user-123' } } } }) // initial load
        .mockResolvedValueOnce({ data: { session: null } }); // loadSessionDetail call

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadSessionDetail('session-1');
      });

      expect(result.current.sessionDetailError).toBe('Nicht eingeloggt.');
      expect(result.current.sessionDetailLoading).toBe(false);
    });
  });

  describe('clearSessionDetail', () => {
    beforeEach(() => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      });
      syncService.loadMyRoundsAcrossSessions.mockResolvedValue({ data: [], error: null });
      syncService.loadLinkedSessions.mockResolvedValue({ data: [], error: null });
    });

    it('clears session detail and error state', async () => {
      const mockSessionData = {
        session: { id: 'session-1', seating: ['A', 'B', 'C'] },
        rounds: [],
        spiellisten: [],
        activeSpiellisteId: null,
        isReadOnly: true,
      };
      syncService.loadSessionForClaimedPlayer.mockResolvedValue({
        data: mockSessionData,
        error: null,
      });

      const { result } = renderHook(() => useProfileData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load a session detail first
      await act(async () => {
        await result.current.loadSessionDetail('session-1');
      });

      expect(result.current.sessionDetail).toEqual(mockSessionData);

      // Clear it
      act(() => {
        result.current.clearSessionDetail();
      });

      expect(result.current.sessionDetail).toBeNull();
      expect(result.current.sessionDetailError).toBeNull();
    });
  });
});
