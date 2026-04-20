/**
 * useSessionInit — handles session loading on app mount.
 *
 * Tries to restore the last session from localStorage, falls back to the
 * most recent session in the DB, and marks loading as complete either way.
 *
 * @param {function} dispatch        - gameReducer dispatch
 * @param {function} setSyncStatus   - setter for sync status string
 * @param {function} setSyncError    - setter for sync error message
 * @param {function} setSessionLoaded - setter for loaded flag
 */

import { useEffect } from 'react';
import * as syncService from '../lib/syncService';

export const SESSION_STORAGE_KEY = 'skatSessionId';

export function useSessionInit(dispatch, setSyncStatus, setSyncError, setSessionLoaded) {
  useEffect(() => {
    async function initSession() {
      setSyncStatus('syncing');

      const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedId) {
        const { data, error } = await syncService.loadSession(storedId);
        if (!error && data) {
          dispatch({ type: 'LOAD_SESSION', payload: data });
          setSessionLoaded(true);
          setSyncStatus('synced');
          return;
        }
        // Only discard the stored ID if the session genuinely doesn't exist (404/not found).
        // Network errors (fetch failed, offline) should keep the ID so the next online
        // startup can still find the session.
        const isNetworkError = !error || error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('failed');
        if (!isNetworkError) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        } else {
          // Offline at startup — mark as loaded so the app shell renders
          setSessionLoaded(true);
          setSyncStatus('error');
          setSyncError('Keine Verbindung. Daten werden geladen sobald du wieder online bist.');
          return;
        }
      }

      const { data: sessions, error: listError } = await syncService.listSessions();
      if (listError || !sessions?.length) {
        setSessionLoaded(true);
        setSyncStatus('synced');
        return;
      }

      const { data, error } = await syncService.loadSession(sessions[0].id);
      if (error || !data) {
        setSyncStatus('error');
        setSyncError(error?.message ?? 'Fehler beim Laden der Session');
        return;
      }

      localStorage.setItem(SESSION_STORAGE_KEY, sessions[0].id);
      dispatch({ type: 'LOAD_SESSION', payload: data });
      setSessionLoaded(true);
      setSyncStatus('synced');
    }

    initSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
