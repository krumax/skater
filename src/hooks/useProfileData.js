/**
 * useProfileData.js - Loads and computes profile data for the current authenticated user.
 *
 * Fetches all rounds across sessions linked to the user's account,
 * then derives aggregated profile stats and per-session summaries.
 *
 * Requirements: 5.1, 5.5, 5.8
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
 * }}
 */
export function useProfileData() {
  const [stats, setStats] = useState(null);
  const [sessionSummaries, setSessionSummaries] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Incrementing this counter triggers a re-fetch
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => {
    setReloadCount(c => c + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfileData() {
      setLoading(true);
      setError(null);

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
        }
        return;
      }

      try {
        const { data: rounds, error: loadError } = await syncService.loadMyRoundsAcrossSessions(userId);

        if (cancelled) return;

        if (loadError) {
          setError(loadError.message ?? 'Fehler beim Laden der Profildaten.');
          setLoading(false);
          return;
        }

        const profileStats = computeProfileStats(rounds ?? []);
        const summaries = computePerSessionStats(rounds ?? []);

        setStats(profileStats);
        setSessionSummaries(summaries);
        setRounds(rounds ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message ?? 'Fehler beim Laden der Profildaten.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfileData();

    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  return { stats, sessionSummaries, rounds, loading, error, reload };
}
