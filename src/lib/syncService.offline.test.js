import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock localStorage ──
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ── Mock navigator.onLine ──
let isOnline = true;
Object.defineProperty(global, 'navigator', {
  value: {
    get onLine() { return isOnline; }
  },
  writable: true
});

// ── Mock Supabase ──
vi.mock('./supabaseClient', () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    
    return {
        supabase: {
            auth: {
                getSession: vi.fn().mockResolvedValue({ data: { session: null } })
            },
            from: vi.fn(() => ({
                insert: insertMock
            }))
        }
    }
});

import { insertRound, processOfflineQueue, getOfflineQueue } from './syncService.js';
import { supabase } from './supabaseClient';

describe('Offline Queue (syncService.js)', () => {

  beforeEach(() => {
    localStorageMock.clear();
    isOnline = true;
    vi.clearAllMocks();
  });

  it('bypasses the offline queue when navigator.onLine is true', async () => {
    isOnline = true;
    const round = { id: 1, player: 'Alice', gameType: 'club', typeLabel: 'Kreuz', gameValue: 48, won: true };
    await insertRound(round, 'session-123');

    const q = getOfflineQueue();
    expect(q).toHaveLength(0); // No queue stored

    expect(supabase.from).toHaveBeenCalledWith('rounds');
  });

  it('queues the mutation in localStorage when offline and returns a dummy success', async () => {
    isOnline = false;
    const round = { id: 1, player: 'Bob' };
    
    const response = await insertRound(round, 'session-456');
    
    // UI sollte sofort eine Erfolgsmeldung mit Dummy-ID bekommen
    expect(response.error).toBeNull();
    expect(response.data._dbId).toContain('offline_');
    
    // Die Aktion muss im localStorage der Queue liegen
    const q = getOfflineQueue();
    expect(q).toHaveLength(1);
    expect(q[0].action).toBe('insertRound');
    expect(q[0].payload.round.player).toBe('Bob');
    
    // Supabase darf NICHT gerufen werden
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('processes and empties the queue when going back online', async () => {
    // 1. Offline & speichern
    isOnline = false;
    await insertRound({ id: 1, player: 'Charlie' }, 'session-789');

    expect(getOfflineQueue()).toHaveLength(1);
    expect(supabase.from).not.toHaveBeenCalled();

    // 2. Wieder online & Queue durchlaufen
    isOnline = true;
    await processOfflineQueue();

    // 3. Queue muss leer sein, Supabase muss gerufen worden sein
    expect(getOfflineQueue()).toHaveLength(0);
    expect(supabase.from).toHaveBeenCalledWith('rounds');
  });
});
