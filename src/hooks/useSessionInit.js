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
        localStorage.removeItem(SESSION_STORAGE_KEY);
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
