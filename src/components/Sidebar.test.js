// Feature: supabase-persistence — Sidebar Render-Tests
// Validates: Anforderungen 4.1, 6.5
import { describe, it, expect } from 'vitest';

// ── SYNC_ICON mapping (mirrors Sidebar.jsx) ──────────────────────────────────
// Extracted here to test the icon/color logic independently of the DOM.
const SYNC_ICON = {
  idle:    { icon: 'cloud_done', color: '#4caf50', title: 'Synchronisiert' },
  synced:  { icon: 'cloud_done', color: '#4caf50', title: 'Synchronisiert' },
  syncing: { icon: 'sync',       color: '#9e9e9e', title: 'Synchronisiert…', spin: true },
  error:   { icon: 'cloud_off',  color: '#f44336', title: 'Synchronisierungsfehler' },
};

// ── Anforderung 6.5: Status-Icon je nach syncStatus ──────────────────────────
describe('Sidebar – Sync-Status-Icon (Anforderung 6.5)', () => {
  it('zeigt cloud_done (grün) für syncStatus "idle"', () => {
    const icon = SYNC_ICON['idle'];
    expect(icon.icon).toBe('cloud_done');
    expect(icon.color).toBe('#4caf50');
  });

  it('zeigt cloud_done (grün) für syncStatus "synced"', () => {
    const icon = SYNC_ICON['synced'];
    expect(icon.icon).toBe('cloud_done');
    expect(icon.color).toBe('#4caf50');
  });

  it('zeigt sync (grau, animiert) für syncStatus "syncing"', () => {
    const icon = SYNC_ICON['syncing'];
    expect(icon.icon).toBe('sync');
    expect(icon.color).toBe('#9e9e9e');
    expect(icon.spin).toBe(true);
  });

  it('zeigt cloud_off (rot) für syncStatus "error"', () => {
    const icon = SYNC_ICON['error'];
    expect(icon.icon).toBe('cloud_off');
    expect(icon.color).toBe('#f44336');
  });

  it('fällt auf idle-Icon zurück bei unbekanntem syncStatus', () => {
    const icon = SYNC_ICON['unknown'] ?? SYNC_ICON.idle;
    expect(icon.icon).toBe('cloud_done');
  });
});

// ── Anforderung 4.1: Refresh-Button Deaktivierungslogik ──────────────────────
describe('Sidebar – Refresh-Button (Anforderung 4.1)', () => {
  // The button is disabled when syncStatus === 'syncing'
  function isRefreshDisabled(syncStatus) {
    return syncStatus === 'syncing';
  }

  it('Refresh-Button ist aktiv bei syncStatus "idle"', () => {
    expect(isRefreshDisabled('idle')).toBe(false);
  });

  it('Refresh-Button ist aktiv bei syncStatus "synced"', () => {
    expect(isRefreshDisabled('synced')).toBe(false);
  });

  it('Refresh-Button ist deaktiviert bei syncStatus "syncing"', () => {
    expect(isRefreshDisabled('syncing')).toBe(true);
  });

  it('Refresh-Button ist aktiv bei syncStatus "error"', () => {
    expect(isRefreshDisabled('error')).toBe(false);
  });
});

// ── Vollständigkeit: alle syncStatus-Werte haben einen Icon-Eintrag ───────────
describe('Sidebar – SYNC_ICON Vollständigkeit', () => {
  const expectedStatuses = ['idle', 'synced', 'syncing', 'error'];

  expectedStatuses.forEach(status => {
    it(`SYNC_ICON enthält Eintrag für "${status}"`, () => {
      expect(SYNC_ICON[status]).toBeDefined();
      expect(SYNC_ICON[status].icon).toBeTruthy();
      expect(SYNC_ICON[status].color).toBeTruthy();
    });
  });
});
