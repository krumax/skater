import { useState, useMemo } from 'react';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from '../../lib/achievementConfig';
import { ColHeader, RowLabel, NullRowLabel } from './MatrixCell';

/**
 * ProfileGameMatrix - Shows a matrix of games played by the user across all tables.
 * Rows = game types, Columns = Spitzen/modifiers.
 * Cells show the count of games played (won or lost).
 * Tooltip on hover shows the win rate for that cell.
 *
 * Uses the same visual style as AchievementMatrix on the Spielerstatistik page.
 */
export default function ProfileGameMatrix({ rounds }) {
  const matrixData = useMemo(() => computeMatrixData(rounds), [rounds]);

  if (!rounds || rounds.length === 0) {
    return (
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', boxShadow: '0 8px 32px var(--shadow-color)', padding: '2rem', textAlign: 'center', color: 'var(--outline)', border: '1px solid rgba(192,200,195,0.3)' }}>
        <p>Noch keine Daten für die Matrix.</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', boxShadow: '0 8px 32px var(--shadow-color)', overflow: 'hidden', border: '1px solid rgba(192,200,195,0.3)' }}>
      <div style={{ padding: '1rem 1rem 0.5rem', borderBottom: '1px solid rgba(192,200,195,0.3)' }}>
        <p className="stat-label">Spielematrix</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-low)' }}>
              <th style={{ padding: '0.5rem', borderRight: '1px solid rgba(192,200,195,0.5)', minWidth: '90px' }} />
              {COL_SPECS.map(col => (
                <th key={col.id} style={{ padding: '0.5rem 0.25rem', minWidth: '44px', backgroundColor: col.isSpecial ? 'rgba(116,91,0,0.05)' : 'transparent' }}>
                  <ColHeader col={col} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Normal game type rows */}
            {MATRIX_ROWS.map(row => (
              <tr
                key={row.type}
                style={{
                  borderTop: '1px solid rgba(192,200,195,0.3)',
                  backgroundColor: row.type === 'grand' ? 'rgba(208,166,0,0.05)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-high)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = row.type === 'grand' ? 'rgba(208,166,0,0.05)' : ''; }}
              >
                <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left', minWidth: '90px' }}>
                  <RowLabel row={row} />
                </td>
                {COL_SPECS.map(col => (
                  <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: col.isSpecial ? 'rgba(116,91,0,0.05)' : 'transparent' }}>
                    <ProfileCell cellData={matrixData[row.type]?.[col.id]} isSpecial={col.isSpecial} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Null rows */}
            {NULL_ROWS.map(nr => (
              <tr
                key={nr.id}
                style={{
                  borderTop: '1px solid rgba(192,200,195,0.3)',
                  backgroundColor: 'rgba(113,121,116,0.04)',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--surface-high)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(113,121,116,0.04)'; }}
              >
                <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left', minWidth: '90px' }}>
                  <NullRowLabel name={nr.name} />
                </td>
                {COL_SPECS.map((col, idx) => {
                  // First 8 columns (Spitzen) → merged "Ansage entfällt"
                  if (idx === 0) {
                    return (
                      <td key="null-label" colSpan={8} style={{ padding: '0.25rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--on-surface-variant)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'italic' }}>
                          Ansage entfällt
                        </div>
                      </td>
                    );
                  }
                  if (idx < 8) return null;
                  // Special columns
                  return (
                    <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: 'rgba(116,91,0,0.05)' }}>
                      <ProfileCell cellData={matrixData[nr.id]?.[col.id]} isSpecial />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * ProfileCell - A single matrix cell showing game count with win rate tooltip.
 * Styled identically to MatrixCell from the achievement matrix.
 */
function ProfileCell({ cellData, isSpecial }) {
  const count = cellData?.count ?? 0;
  const wins = cellData?.wins ?? 0;
  const winRate = count > 0 ? ((wins / count) * 100).toFixed(0) : null;

  const unlockedBg = isSpecial ? 'var(--tertiary-container)' : 'var(--primary-container)';
  const unlockedColor = isSpecial ? '#000' : '#fff';
  const lockedBorder = isSpecial ? 'rgba(116,91,0,0.3)' : 'var(--outline-variant)';

  const tooltip = count > 0
    ? `${count}× gespielt · Siegquote: ${winRate}% (${wins}/${count})`
    : undefined;

  const baseStyle = {
    width: '2rem', height: '2rem', margin: '0 auto',
    borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.7rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif",
    transition: 'transform 0.2s',
  };

  if (count > 0) {
    return (
      <div
        title={tooltip}
        style={{ ...baseStyle, backgroundColor: unlockedBg, color: unlockedColor }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {count}
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, border: `1px dashed ${lockedBorder}`, opacity: 0.5 }} />
  );
}

// ── Data computation ──────────────────────────────────────────────────────────

function computeMatrixData(rounds) {
  if (!rounds || rounds.length === 0) return {};

  const result = {};

  // Initialize structure for normal rows
  for (const row of MATRIX_ROWS) {
    result[row.type] = {};
    for (const col of COL_SPECS) {
      result[row.type][col.id] = { count: 0, wins: 0 };
    }
  }

  // Initialize structure for null rows
  for (const row of NULL_ROWS) {
    result[row.id] = {};
    for (const col of COL_SPECS) {
      result[row.id][col.id] = { count: 0, wins: 0 };
    }
  }

  // Map gameType values to row keys
  const typeMap = {
    'Grand': 'grand', 'Kreuz': 'club', 'Pik': 'spade', 'Herz': 'heart', 'Karo': 'diamond',
    'grand': 'grand', 'club': 'club', 'spade': 'spade', 'heart': 'heart', 'diamond': 'diamond',
  };

  for (const r of rounds) {
    if (r.gameType === 'passed') continue;

    let rowKey = null;

    if (r.gameType === 'null') {
      for (const nullRow of NULL_ROWS) {
        if (nullRow.check(r)) {
          rowKey = nullRow.id;
          break;
        }
      }
      if (!rowKey) rowKey = 'null';
    } else {
      rowKey = typeMap[r.gameType] ?? typeMap[r.typeLabel] ?? null;
    }

    if (!rowKey || !result[rowKey]) continue;

    for (const col of COL_SPECS) {
      // For null rows, skip spitzen columns
      if (r.gameType === 'null' && !col.isSpecial) continue;

      if (col.check(r)) {
        result[rowKey][col.id].count += 1;
        if (r.won) {
          result[rowKey][col.id].wins += 1;
        }
      }
    }
  }

  return result;
}
