// @vitest-environment jsdom
// Feature: iconset-selection – Unit-Tests für SuitIcon
// Validates: Requirements 3.7, 4.3, 4.4, 5.5

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuitIcon from './SuitIcon';
import { IconsetProvider } from '../context/IconsetContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Renders SuitIcon wrapped in an IconsetProvider that is pre-seeded with the
 * given iconset value via localStorage.
 */
function renderWithIconset(iconset, props) {
  localStorage.setItem('skatIconset', iconset);
  return render(
    <IconsetProvider>
      <SuitIcon {...props} />
    </IconsetProvider>
  );
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── Test 1: Special game types always render material-symbols-outlined span ───
// Validates: Requirement 3.7

describe('Special game types always use Material Icons (Requirement 3.7)', () => {
  const specialTypes = ['grand', 'null', 'passed'];

  for (const gameType of specialTypes) {
    it(`renders a material-symbols-outlined span for '${gameType}' with iconset 'french'`, () => {
      const { container } = renderWithIconset('french', { gameType });
      const span = container.querySelector('span.material-symbols-outlined');
      expect(span).not.toBeNull();
    });

    it(`renders a material-symbols-outlined span for '${gameType}' with iconset 'altenburg'`, () => {
      const { container } = renderWithIconset('altenburg', { gameType });
      const span = container.querySelector('span.material-symbols-outlined');
      expect(span).not.toBeNull();
    });
  }

  it("renders the 'stars' icon for 'grand'", () => {
    const { container } = renderWithIconset('french', { gameType: 'grand' });
    expect(container.querySelector('span.material-symbols-outlined').textContent).toBe('stars');
  });

  it("renders the 'block' icon for 'null'", () => {
    const { container } = renderWithIconset('french', { gameType: 'null' });
    expect(container.querySelector('span.material-symbols-outlined').textContent).toBe('block');
  });

  it("renders the 'skip_next' icon for 'passed'", () => {
    const { container } = renderWithIconset('french', { gameType: 'passed' });
    expect(container.querySelector('span.material-symbols-outlined').textContent).toBe('skip_next');
  });
});

// ── Test 2: Suit types render Unicode symbol when iconset is 'french' ─────────
// Validates: Requirement 5.5

describe("Suit types render Unicode symbol when iconset is 'french' (Requirement 5.5)", () => {
  const suitSymbols = [
    { gameType: 'club',    symbol: '♣' },
    { gameType: 'spade',   symbol: '♠' },
    { gameType: 'heart',   symbol: '♥' },
    { gameType: 'diamond', symbol: '♦' },
  ];

  for (const { gameType, symbol } of suitSymbols) {
    it(`renders Unicode '${symbol}' for '${gameType}' with iconset 'french'`, () => {
      const { container } = renderWithIconset('french', { gameType });
      // Should NOT render an img
      expect(container.querySelector('img')).toBeNull();
      // Should render a span with the Unicode symbol
      const span = container.querySelector('span:not(.material-symbols-outlined)');
      expect(span).not.toBeNull();
      expect(span.textContent).toBe(symbol);
    });
  }
});

// ── Test 3: Suit types render an <img> when iconset is 'altenburg' ────────────
// Validates: Requirements 4.3, 5.5

describe("Suit types render <img> when iconset is 'altenburg' (Requirements 4.3, 5.5)", () => {
  const suits = ['club', 'spade', 'heart', 'diamond'];

  for (const gameType of suits) {
    it(`renders an <img> for '${gameType}' with iconset 'altenburg'`, () => {
      const { container } = renderWithIconset('altenburg', { gameType });
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
    });
  }
});

// ── Test 4: <img> has correct German alt attribute ────────────────────────────
// Validates: Requirement 4.3

describe('<img> has correct German alt attribute (Requirement 4.3)', () => {
  const altMapping = [
    { gameType: 'club',    alt: 'Eichel'   },
    { gameType: 'spade',   alt: 'Grün'     },
    { gameType: 'heart',   alt: 'Rot'      },
    { gameType: 'diamond', alt: 'Schellen' },
  ];

  for (const { gameType, alt } of altMapping) {
    it(`'${gameType}' img has alt="${alt}"`, () => {
      const { container } = renderWithIconset('altenburg', { gameType });
      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img.getAttribute('alt')).toBe(alt);
    });
  }
});

// ── Test 5: Image load error causes fallback to Unicode symbol ────────────────
// Validates: Requirement 4.4

describe('Image load error falls back to Unicode symbol (Requirement 4.4)', () => {
  const suitSymbols = [
    { gameType: 'club',    symbol: '♣' },
    { gameType: 'spade',   symbol: '♠' },
    { gameType: 'heart',   symbol: '♥' },
    { gameType: 'diamond', symbol: '♦' },
  ];

  for (const { gameType, symbol } of suitSymbols) {
    it(`falls back to Unicode '${symbol}' for '${gameType}' after image error`, () => {
      const { container } = renderWithIconset('altenburg', { gameType });

      // Initially renders an img
      const img = container.querySelector('img');
      expect(img).not.toBeNull();

      // Simulate image load error
      fireEvent.error(img);

      // After error: img should be gone, Unicode span should appear
      expect(container.querySelector('img')).toBeNull();
      const span = container.querySelector('span:not(.material-symbols-outlined)');
      expect(span).not.toBeNull();
      expect(span.textContent).toBe(symbol);
    });
  }
});

// ── Test 6: size prop maps to correct font-size / image dimensions ────────────
// Validates: Requirement 5.5

describe('size prop maps to correct dimensions', () => {
  const sizeMap = {
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
  };

  describe('Unicode span (french iconset)', () => {
    for (const [size, expectedFontSize] of Object.entries(sizeMap)) {
      it(`size='${size}' sets font-size to ${expectedFontSize} on the span`, () => {
        const { container } = renderWithIconset('french', { gameType: 'club', size });
        const span = container.querySelector('span:not(.material-symbols-outlined)');
        expect(span).not.toBeNull();
        expect(span.style.fontSize).toBe(expectedFontSize);
      });
    }

    it("defaults to '1rem' (md) when size prop is omitted", () => {
      const { container } = renderWithIconset('french', { gameType: 'club' });
      const span = container.querySelector('span:not(.material-symbols-outlined)');
      expect(span.style.fontSize).toBe('1rem');
    });
  });

  describe('Altenburg img (altenburg iconset)', () => {
    for (const [size, expectedDimension] of Object.entries(sizeMap)) {
      it(`size='${size}' sets width and height to ${expectedDimension} on the img`, () => {
        const { container } = renderWithIconset('altenburg', { gameType: 'club', size });
        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        expect(img.style.width).toBe(expectedDimension);
        expect(img.style.height).toBe(expectedDimension);
      });
    }

    it("defaults to '1rem' (md) when size prop is omitted", () => {
      const { container } = renderWithIconset('altenburg', { gameType: 'club' });
      const img = container.querySelector('img');
      expect(img.style.width).toBe('1rem');
      expect(img.style.height).toBe('1rem');
    });
  });

  describe('Material Icons span (special game types)', () => {
    for (const [size, expectedFontSize] of Object.entries(sizeMap)) {
      it(`size='${size}' sets font-size to ${expectedFontSize} on the material-symbols span`, () => {
        const { container } = renderWithIconset('french', { gameType: 'grand', size });
        const span = container.querySelector('span.material-symbols-outlined');
        expect(span).not.toBeNull();
        expect(span.style.fontSize).toBe(expectedFontSize);
      });
    }
  });
});
