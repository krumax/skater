/**
 * GameTypeHeatmap - Heatmap: Spieler × Spieltyp.
 * Zeigt die Gewinnrate jedes Spielers pro Spieltyp als Farbintensität.
 */
import { useMemo } from 'react';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/skatScoring';
import { SUIT_COLORS } from '../../lib/tokens';

const GAME_TYPES = ['grand', 'club', 'spade', 'heart', 'diamond', 'null'];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

// Farbskala: Mittelpunkt bei 70% (typische Skat-Gewinnrate)
// < 50%  → kräftig rot
// 50-70% → rot → neutral
// 70-85% → neutral → hellgrün
// > 85%  → kräftig grün
function rateToColor(rate) {
  if (rate === null) return 'var(--surface-low)';

  if (rate >= 85) {
    // hellgrün → kräftig grün
    const t = Math.min(1, (rate - 85) / 15);
    return `rgb(${lerp(40, 11, t)},${lerp(100, 61, t)},${lerp(60, 46, t)})`;
  } else if (rate >= 70) {
    // neutral → hellgrün
    const t = (rate - 70) / 15;
    return `rgb(${lerp(90, 40, t)},${lerp(100, 100, t)},${lerp(80, 60, t)})`;
  } else if (rate >= 50) {
    // rot → neutral
    const t = (rate - 50) / 20;
    return `rgb(${lerp(160, 90, t)},${lerp(40, 100, t)},${lerp(30, 80, t)})`;
  } else {
    // kräftig rot
    const t = Math.min(1, (50 - rate) / 50);
    return `rgb(${lerp(160, 200, t)},${lerp(40, 20, t)},${lerp(30, 20, t)})`;
  }
}

export default function GameTypeHeatmap({ rounds, players }) {
  const data = useMemo(() => {
    return players.map(player => {
      const row = { player };
      GAME_TYPES.forEach(type => {
        const games = rounds.filter(r => r.player === player && r.gameType === type);
        row[type] = games.length > 0
          ? { rate: Math.round((games.filter(r => r.won).length / games.length) * 100), count: games.length }
          : null;
      });
      return row;
    });
  }, [rounds, players]);

  if (players.length === 0) return null;

  const cellW = 64;
  const cellH = 44;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: '3px', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: '90px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', paddingBottom: '0.5rem' }}>Spieler</th>
            {GAME_TYPES.map(type => (
              <th key={type} style={{ width: `${cellW}px`, textAlign: 'center', paddingBottom: '0.5rem' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '1.5rem', height: '1.5rem', borderRadius: '0.3rem',
                  backgroundColor: SUIT_COLORS[type],
                  color: type === 'diamond' ? '#1b1c1c' : '#fff',
                }}>
                  {type === 'grand' || type === 'null'
                    ? <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {type === 'grand' ? 'stars' : 'block'}
                      </span>
                    : SUIT_SYMBOLS[type]
                  }
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--outline)', marginTop: '0.2rem' }}>{SUIT_LABELS[type]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.player}>
              <td style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface)', paddingRight: '0.5rem', whiteSpace: 'nowrap' }}>{row.player}</td>
              {GAME_TYPES.map(type => {
                const cell = row[type];
                const bg = rateToColor(cell?.rate ?? null);
                const textColor = cell === null ? 'var(--outline)' : cell.rate > 40 ? '#fff' : '#fff';
                return (
                  <td key={type} title={cell ? `${cell.rate}% (${cell.count} Spiele)` : 'Keine Daten'} style={{
                    width: `${cellW}px`, height: `${cellH}px`,
                    backgroundColor: bg,
                    borderRadius: '0.375rem',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    cursor: cell ? 'default' : 'default',
                  }}>
                    {cell ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: textColor }}>{cell.rate}%</div>
                        <div style={{ fontSize: '0.6rem', color: textColor, opacity: 0.75 }}>{cell.count}×</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--outline)', opacity: 0.4 }}>–</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legende */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--outline)' }}>0%</span>
        <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(to right, rgb(200,20,20), rgb(160,40,30), rgb(90,100,80), rgb(40,100,60), rgb(11,61,46))' }} />
        <span style={{ fontSize: '0.65rem', color: 'var(--outline)' }}>100%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--outline)', opacity: 0.7 }}>Mittelpunkt bei 70% (typische Gewinnrate)</span>
      </div>
    </div>
  );
}
