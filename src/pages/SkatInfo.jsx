import React from 'react';
import { SUIT_COLORS } from '../lib/tokens';

// ── Reiztabelle-Daten ──
// Spalten: Gewinnstufen 1–5, Hand(6), Schneider(7), Schn.anges.(8), Schwarz(9), Schw.anges.(10), Ouvert(11)
const SUIT_ROWS = [
  { key: 'diamond', name: 'Karo',  suit: '♦', base: 9,  textColor: '#1b1c1c' },
  { key: 'heart',   name: 'Herz',  suit: '♥', base: 10, textColor: '#fff' },
  { key: 'spade',   name: 'Pik',   suit: '♠', base: 11, textColor: '#fff' },
  { key: 'club',    name: 'Kreuz', suit: '♣', base: 12, textColor: '#fff' },
];

const GRAND_BASE = 24;

// Spalten-Header
const COL_HEADERS = [
  { label: '1',  sub: null },
  { label: '2',  sub: null },
  { label: '3',  sub: null },
  { label: '4',  sub: null },
  { label: '5',  sub: null },
  { label: '6',  sub: 'Hand' },
  { label: '7',  sub: 'Schneider' },
  { label: '8',  sub: 'Schneider', subIcon: 'campaign' },
  { label: '9',  sub: 'Schwarz' },
  { label: '10', sub: 'Schwarz', subIcon: 'campaign' },
  { label: '11', sub: 'Ouvert' },
];

// Null-Spiele (feste Werte)
const NULL_ROWS = [
  { name: 'Null',            cols: [null, 23,   null, null, null, null, null, null, null, null, null] },
  { name: 'Null Hand',       cols: [null, null, 35,   null, null, null, null, null, null, null, null] },
  { name: 'Null Ouvert',     cols: [null, null, null, 46,   null, null, null, null, null, null, null] },
  { name: 'Null Ouvert Hand',cols: [null, null, null, null, 59,   null, null, null, null, null, null] },
];

function suitValue(base, multiplier) {
  return base * multiplier;
}

const cellBase = {
  padding: '0.4rem 0.5rem',
  textAlign: 'right',
  fontSize: '0.8125rem',
  fontWeight: 600,
  borderBottom: '1px solid rgba(192,200,195,0.25)',
};

const headerCellBase = {
  padding: '0.5rem 0.5rem',
  fontSize: '0.6rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'right',
  color: 'var(--on-surface-variant)',
  borderBottom: '2px solid rgba(192,200,195,0.4)',
  whiteSpace: 'nowrap',
};

export default function SkatInfo() {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Regelwerk</h1>
        <p className="page-subtitle">Nachschlagewerk - Reiztabelle und Spielwerte auf einen Blick.</p>
      </header>

      {/* ── Reiztabelle ── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Offizielle Werte</span>
          <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reiztabelle</h3>
          <p style={{ color: 'var(--on-surface-variant)' }}>Spielwert = Grundwert × Gewinnstufe. Die Gewinnstufe ergibt sich aus Mit/Ohne Spitzen + Spielstufen-Modifikatoren.
            <span
              className="material-symbols-outlined"
              title="Gewinnstufe = Anzahl Spitzen (mit oder ohne) + 1 (Grundstufe) + je 1 für Hand, Schneider, Schneider angesagt, Schwarz, Schwarz angesagt, Ouvert. Spalten 1–5 = nur Spitzen, Spalten 6–11 = mit Modifikatoren."
              style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, verticalAlign: 'middle', marginLeft: '0.35rem', fontVariationSettings: "'FILL' 0" }}
            >info</span>
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', boxShadow: '0 8px 32px var(--shadow-color)', overflow: 'hidden', border: '1px solid rgba(192,200,195,0.3)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {/* Zeile 1: Spielart-Header (rowSpan 2) + Modifikator-Namen */}
                <tr style={{ backgroundColor: 'var(--surface-low)' }}>
                  <th rowSpan={2} style={{ ...headerCellBase, textAlign: 'left', minWidth: '130px', borderRight: '1px solid rgba(192,200,195,0.4)', paddingLeft: '1rem', verticalAlign: 'bottom' }}>
                    Spielart
                  </th>
                  {/* Leere Zellen für Gewinnstufen 1–5 */}
                  {[0,1,2,3,4].map(i => (
                    <th key={i} style={{ ...headerCellBase, minWidth: '52px', borderBottom: 'none', padding: '0.25rem 0.5rem' }} />
                  ))}
                  {/* Modifikator-Namen für Spalten 6–11 */}
                  {COL_HEADERS.slice(5).map((col, i) => (
                    <th key={i} style={{
                      ...headerCellBase,
                      minWidth: '52px',
                      borderBottom: 'none',
                      padding: '0.4rem 0.5rem 0.1rem',
                      backgroundColor: 'rgba(116, 91, 0, 0.06)',
                      color: 'var(--tertiary)',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.15rem', fontSize: '0.65rem', fontWeight: 800 }}>
                        {col.sub}
                        {col.subIcon && <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>{col.subIcon}</span>}
                      </span>
                    </th>
                  ))}
                </tr>
                {/* Zeile 2: Gewinnstufen 1–11 */}
                <tr style={{ backgroundColor: 'var(--surface-low)' }}>
                  {COL_HEADERS.map((col, i) => (
                    <th key={i} style={{
                      ...headerCellBase,
                      minWidth: '52px',
                      paddingTop: '0.1rem',
                      backgroundColor: i >= 5 ? 'rgba(116, 91, 0, 0.06)' : 'transparent',
                      color: i >= 5 ? 'var(--tertiary)' : 'var(--on-surface-variant)',
                    }}>
                      <span style={{ fontSize: '0.75rem' }}>{col.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Farbspiele + Grand */}
                {[...SUIT_ROWS, { key: 'grand', name: 'Grand', suit: null, base: GRAND_BASE, textColor: '#fff', matIcon: 'stars' }].map((row) => (
                  <tr key={row.key}
                    style={{ transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Spielart-Label */}
                    <td style={{ ...cellBase, textAlign: 'left', paddingLeft: '1rem', borderRight: '1px solid rgba(192,200,195,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.3rem', backgroundColor: SUIT_COLORS[row.key], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {row.matIcon
                            ? <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: row.textColor }}>{row.matIcon}</span>
                            : <span style={{ fontSize: '0.9rem', fontWeight: 700, color: row.textColor, lineHeight: 1 }}>{row.suit}</span>
                          }
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{row.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--outline)', fontWeight: 500 }}>×{row.base}</span>
                      </div>
                    </td>
                    {/* Werte für Gewinnstufen 1–11 */}
                    {COL_HEADERS.map((_, i) => {
                      const multiplier = i + 1;
                      const val = suitValue(row.base, multiplier);
                      const isSpecial = i >= 5;
                      return (
                        <td key={i} style={{
                          ...cellBase,
                          backgroundColor: isSpecial ? 'rgba(116, 91, 0, 0.04)' : 'transparent',
                          fontWeight: isSpecial ? 700 : 600,
                          color: isSpecial ? 'var(--tertiary)' : 'var(--on-surface)',
                        }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Trennlinie vor Null */}
                <tr><td colSpan={12} style={{ height: '0', borderTop: '2px solid rgba(192,200,195,0.4)', padding: 0 }} /></tr>

                {/* Null-Spiele */}
                {NULL_ROWS.map((row) => (
                  <tr key={row.name}
                    style={{ transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ ...cellBase, textAlign: 'left', paddingLeft: '1rem', borderRight: '1px solid rgba(192,200,195,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.3rem', backgroundColor: SUIT_COLORS.null, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#fff' }}>block</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{row.name}</span>
                      </div>
                    </td>
                    {row.cols.map((val, i) => (
                      <td key={i} style={{
                        ...cellBase,
                        backgroundColor: i >= 5 ? 'rgba(116, 91, 0, 0.04)' : 'transparent',
                        color: val !== null ? 'var(--on-surface)' : 'transparent',
                        fontWeight: 700,
                      }}>
                        {val ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legende */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(116,91,0,0.15)', display: 'inline-block' }} />
            Spalten 6–11: Spielstufen-Modifikatoren (Hand, Schneider, Schwarz, Ouvert)
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Spielwert = Grundwert × Gewinnstufe (Mit/Ohne Spitzen + Modifikatoren)
          </span>
        </div>
      </section>
    </div>
  );
}
