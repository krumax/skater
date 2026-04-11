import React from 'react';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from '../../lib/achievementConfig';
import { useMatrixData } from '../../hooks/useMatrixData';
import { MatrixCell, ColHeader, RowLabel, NullRowLabel } from './MatrixCell';

const rowHover = {
  onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = 'var(--surface-high)'; },
  onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = ''; },
};

export default function AchievementMatrix({ rounds, player }) {
  const { map } = useMatrixData(rounds, player);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', boxShadow: '0 8px 32px var(--shadow-color)', overflow: 'hidden', border: '1px solid rgba(192,200,195,0.3)' }}>
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
              {/* Farb-/Trumpf-Zeilen */}
              {MATRIX_ROWS.map(row => (
                <tr key={row.type}
                  style={{ borderTop: '1px solid rgba(192,200,195,0.3)', backgroundColor: row.type === 'grand' ? 'rgba(208,166,0,0.05)' : 'transparent', transition: 'background-color 0.2s', cursor: 'pointer' }}
                  {...rowHover}>
                  <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left', minWidth: '90px' }}>
                    <RowLabel row={row} />
                  </td>
                  {COL_SPECS.map(col => (
                    <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: col.isSpecial ? 'rgba(116,91,0,0.05)' : 'transparent' }}>
                      <MatrixCell val={map[row.type]?.[col.id]} isSpecial={col.isSpecial} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Null-Varianten */}
              {NULL_ROWS.map(nr => {
                const val = map['null']?.[nr.id];
                return (
                  <tr key={nr.id}
                    style={{ borderTop: '1px solid rgba(192,200,195,0.3)', backgroundColor: 'rgba(113,121,116,0.04)', transition: 'background-color 0.2s' }}
                    {...rowHover}>
                    <td style={{ padding: '0.5rem 0.75rem', borderRight: '1px solid rgba(192,200,195,0.3)', textAlign: 'left', minWidth: '90px' }}>
                      <NullRowLabel name={nr.name} />
                    </td>
                    {COL_SPECS.map((col, idx) => {
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
                      const specialIdx = idx - 8;
                      const isMatch = specialIdx === nr.specialColIdx;
                      if (!isMatch) return <td key={col.id} style={{ padding: '0.25rem', backgroundColor: col.isSpecial ? 'rgba(116,91,0,0.04)' : 'transparent' }} />;
                      return (
                        <td key={col.id} style={{ padding: '0.25rem', textAlign: 'center', backgroundColor: 'rgba(116,91,0,0.05)' }}>
                          <MatrixCell val={val} isSpecial={true} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
