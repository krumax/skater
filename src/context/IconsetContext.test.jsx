// @vitest-environment jsdom
// Feature: iconset-selection – Unit-Tests für IconsetContext
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 5.3, 5.4

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IconsetProvider, useIconset } from './IconsetContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps the hook in an IconsetProvider */
function wrapper({ children }) {
  return <IconsetProvider>{children}</IconsetProvider>;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  // Clear localStorage before each test so tests are isolated
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── Test 1: Default initialization to 'french' when localStorage is empty ────
// Validates: Requirements 2.3

describe('Default initialization (Requirement 2.3)', () => {
  it("initializes to 'french' when localStorage is empty", () => {
    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('french');
  });

  it("initializes to 'french' when localStorage has no 'skatIconset' key", () => {
    localStorage.setItem('someOtherKey', 'altenburg');
    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('french');
  });
});

// ── Test 2: Initialization from localStorage when a valid value is stored ─────
// Validates: Requirements 2.2

describe('Initialization from localStorage (Requirement 2.2)', () => {
  it("initializes to 'altenburg' when localStorage contains 'altenburg'", () => {
    localStorage.setItem('skatIconset', 'altenburg');
    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('altenburg');
  });

  it("initializes to 'french' when localStorage contains 'french'", () => {
    localStorage.setItem('skatIconset', 'french');
    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('french');
  });
});

// ── Test 3: setIconset updates context state ──────────────────────────────────
// Validates: Requirements 2.1

describe('setIconset updates context state (Requirement 2.1)', () => {
  it("updates iconset state to 'altenburg' when setIconset('altenburg') is called", () => {
    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('french');

    act(() => {
      result.current.setIconset('altenburg');
    });

    expect(result.current.iconset).toBe('altenburg');
  });

  it("updates iconset state back to 'french' when setIconset('french') is called", () => {
    localStorage.setItem('skatIconset', 'altenburg');
    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('altenburg');

    act(() => {
      result.current.setIconset('french');
    });

    expect(result.current.iconset).toBe('french');
  });
});

// ── Test 4: setIconset writes to localStorage ─────────────────────────────────
// Validates: Requirements 2.1

describe('setIconset writes to localStorage (Requirement 2.1)', () => {
  it("writes 'altenburg' to localStorage under key 'skatIconset'", () => {
    const { result } = renderHook(() => useIconset(), { wrapper });

    act(() => {
      result.current.setIconset('altenburg');
    });

    expect(localStorage.getItem('skatIconset')).toBe('altenburg');
  });

  it("writes 'french' to localStorage under key 'skatIconset'", () => {
    localStorage.setItem('skatIconset', 'altenburg');
    const { result } = renderHook(() => useIconset(), { wrapper });

    act(() => {
      result.current.setIconset('french');
    });

    expect(localStorage.getItem('skatIconset')).toBe('french');
  });
});

// ── Test 5: Error handling when localStorage throws ───────────────────────────
// Validates: Requirements 2.4

describe('Error handling when localStorage throws (Requirement 2.4)', () => {
  it("falls back to 'french' when localStorage.getItem throws on read", () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    const { result } = renderHook(() => useIconset(), { wrapper });
    expect(result.current.iconset).toBe('french');
  });

  it('does not throw when localStorage.setItem throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage quota exceeded');
    });

    const { result } = renderHook(() => useIconset(), { wrapper });

    // setIconset should not throw even if localStorage.setItem fails
    expect(() => {
      act(() => {
        result.current.setIconset('altenburg');
      });
    }).not.toThrow();
  });

  it('still updates state even when localStorage.setItem throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage quota exceeded');
    });

    const { result } = renderHook(() => useIconset(), { wrapper });

    act(() => {
      result.current.setIconset('altenburg');
    });

    // State should still be updated even though persistence failed
    expect(result.current.iconset).toBe('altenburg');
  });
});

// ── Test 6: useIconset throws when called outside IconsetProvider ──────────────
// Validates: Requirements 5.3, 5.4

describe('useIconset throws outside IconsetProvider (Requirements 5.3, 5.4)', () => {
  it('throws an error with a descriptive message when called outside provider', () => {
    // Suppress the expected React error boundary console output
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useIconset());
    }).toThrow('useIconset must be used within IconsetProvider');

    consoleError.mockRestore();
  });
});
