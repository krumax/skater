/**
 * useProfileData.js - Loads and computes profile data for the current authenticated user.
 *
 * Fetches all rounds across sessions linked to the user's account,
 * then derives aggregated profile stats and per-session summaries.
 * Also loads the list of linked sessions via loadLinkedSessions (Req 6.1, 6.5, 6.6).
 *
 * Requirements: 5.1, 5.5, 5.8, 6.1, 6.5, 6.6
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as syncService from '../lib/syncService';
import { computeProfileStats, computePerSessionStats } from '../lib/playerStats';

/**
 * Loads and computes profile data for the current authenticated user.
 *
 * @returns {{
 *   stats: ProfileStats | null,
 *   sessionSummaries: SessionSummary[],
 *   loading: boolean,
 *   error: string | null,
 *   reload: () => void,
 *   linkedSessions: LinkedSessionSummary[],
 *   linkedSessionsLoading: boolean,
 *   linkedSessionsError: string | null,
 *   refetchLinkedSessions: () => void,
 *   sessionDetail: ClaimedSessionDetail | null,
 *   sessionDetailLoading: boolean,
 *   sessionDetailError: string | null,
 *   loadSessionDetail: (sessionId: string) => Promise<void>,
 *   clearSessionDetail: () => void,
 * }}
 */
export function useProfileData() {
  const [stats, setStats] = useState(null);
  const [sessionSummaries, setSessionSummaries] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  // Incrementing this counter triggers a re-fetch
  const [reloadCount, setReloadCount] = useState(0);

  // Linked sessions state (Req 6.1, 6.5, 6.6)
  const [linkedSessions, setLinkedSessions] = useState([]);
  const [linkedSessionsLoading, setLinkedSessionsLoading] = useState(true);
  const [linkedSessionsError, setLinkedSessionsError] = useState(null);
  const [linkedSessionsReloadCount, setLinkedSessionsReloadCount] = useState(0);

  // Session detail state (Req 5.5, 5.6, 5.7)
  const [sessionDetail, setSessionDetail] = useState(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionDetailError, setSessionDetailError] = useState(null);

  const reload = useCallback(() => {
    setReloadCount(c => c + 1);
  }, []);

  const refetchLinkedSessions = useCallback(() => {
    setLinkedSessionsReloadCount(c => c + 1);
  }, []);

  // Load session detail for a claimed player (Req 5.5, 5.6, 5.7)
  const loadSessionDetail = useCallback(async (sessionId) => {
    setSessionDetailLoading(true);
    setSessionDetailError(null);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    if (!userId) {
      setSessionDetailError('Nicht eingeloggt.');
      setSessionDetailLoading(false);
      return;
    }

    try {
      const { data, error: loadError } = await syncService.loadSessionForClaimedPlayer(sessionId, userId);

      if (loadError) {
        setSessionDetail(null);
        setSessionDetailError(loadError.message ?? 'Fehler beim Laden der Session.');
        setSessionDetailLoading(false);
        return;
      }

      setSessionDetail(data);
      setSessionDetailError(null);
    } catch (err) {
      setSessionDetail(null);
      setSessionDetailError(err?.message ?? 'Fehler beim Laden der Session.');
    } finally {
      setSessionDetailLoading(false);
    }
  }, []);

  // Clear session detail state (navigate back to list)
  const clearSessionDetail = useCallback(() => {
    setSessionDetail(null);
    setSessionDetailError(null);
  }, []);

  // Fetch profile stats and linked sessions (existing behavior + Req 6.1, 6.5, 6.6)
  useEffect(() => {
    let cancelled = false;

    async function fetchProfileData() {
      setLoading(true);
      setError(null);
      setLinkedSessionsLoading(true);
      setLinkedSessionsError(null);

      // Req 5.8 / 5.1: get the current user's id
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      // No authenticated user — return empty state immediately
      if (!userId) {
        if (!cancelled) {
          setStats(null);
          setSessionSummaries([]);
          setRounds([]);
          setLoading(false);
          setLinkedSessions([]);
          setLinkedSessionsLoading(false);
          setCurrentUserId(null);
        }
        return;
      }

      if (!cancelled) {
        setCurrentUserId(userId);
      }

      // Fetch profile rounds
      try {
        const { data: rounds, error: loadError } = await syncService.loadMyRoundsAcrossSessions(userId);

        if (cancelled) return;

        if (loadError) {
          setError(loadError.message ?? 'Fehler beim Laden der Profildaten.');
          setLoading(false);
        } else {
          const profileStats = computeProfileStats(rounds ?? []);
          const summaries = computePerSessionStats(rounds ?? []);

          setStats(profileStats);
          setSessionSummaries(summaries);
          setRounds(rounds ?? []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ?? 'Fehler beim Laden der Profildaten.');
          setLoading(false);
        }
      }

      // Fetch linked sessions
      if (cancelled) return;
      try {
        const { data, error: loadError } = await syncService.loadLinkedSessions(userId);

        if (cancelled) return;

        if (loadError) {
          setLinkedSessionsError(loadError.message ?? 'Fehler beim Laden der verknüpften Sessions.');
          setLinkedSessionsLoading(false);
          return;
        }

        setLinkedSessions(data ?? []);
      } catch (err) {
        if (!cancelled) {
          setLinkedSessionsError(err?.message ?? 'Fehler beim Laden der verknüpften Sessions.');
        }
      } finally {
        if (!cancelled) {
          setLinkedSessionsLoading(false);
        }
      }
    }

    fetchProfileData();

    return () => {
      cancelled = true;
    };
  }, [reloadCount, linkedSessionsReloadCount]);

  return {
    stats,
    sessionSummaries,
    rounds,
    loading,
    error,
    reload,
    currentUserId,
    linkedSessions,
    linkedSessionsLoading,
    linkedSessionsError,
    refetchLinkedSessions,
    sessionDetail,
    sessionDetailLoading,
    sessionDetailError,
    loadSessionDetail,
    clearSessionDetail,
  };
}
