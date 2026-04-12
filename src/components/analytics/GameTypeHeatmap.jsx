/**
 * GameTypeHeatmap — Heatmap: Spieler × Spieltyp.
 * Zeigt die Gewinnrate jedes Spielers pro Spieltyp als Farbintensität.
 */
import { useMemo } from 'react';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/skatScoring';
import { SUIT_COLORS } from '../../lib/tokens';

const GAME_TYPES = ['grand', 'club', 'spade', 'heart', 'diamond', 'null'];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function rateToColor(rate) {
  // 0% → rot, 50% → neutral (surface-high), 100% → grün
  if (rate === null) return 'var(--surface-low)';
  const t = rate / 100;
  if (t >= 0.5) {
    // neutral → grün
    const tt = (t - 0.5) * 2;
    const r = lerp(80, 11, tt);
    const g = lerp(80, 61, tt);
    const b = lerp(80, 46, tt);
    return `rgb(${r},${g},${b})`;
  } else {
    // rot → neutral
    const tt = t * 2;
    const r = lerp(181, 80, tt);
    const g = lerp(38, 80, tt);
    const b = lerp(25, 80, tt);
    return `rgb(${r},${g},${b})`;
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
                  backgroundColor: SUIT_COLORS[type], fontSize: '0.8rem',
                  color: type === 'diamond' ? '#1b1c1c' : '#fff',
                }}>
                  {SUIT_SYMBOLS[type]}
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
        <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(to right, rgb(181,38,25), rgb(80,80,80), rgb(11,61,46))' }} />
        <span style={{ fontSize: '0.65rem', color: 'var(--outline)' }}>100%</span>
      </div>
    </div>
  );
}
