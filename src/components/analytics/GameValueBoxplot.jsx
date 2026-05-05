/**
 * GameValueBoxplot - Boxplot der Spielwerte pro Spieltyp.
 * Zeigt Median, Q1/Q3, Whisker und Ausreißer als SVG.
 */
import { useMemo } from 'react';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/skatScoring';
import { SUIT_COLORS } from '../../lib/tokens';
import { useSuitLabel } from '../../hooks/useSuitLabel';

const GAME_TYPES = ['grand', 'club', 'spade', 'heart', 'diamond', 'null'];

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo  = Math.floor(pos);
  const hi  = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function computeBoxStats(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1  = quantile(sorted, 0.25);
  const med = quantile(sorted, 0.50);
  const q3  = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lo  = q1 - 1.5 * iqr;
  const hi  = q3 + 1.5 * iqr;
  const whiskerLo = sorted.find(v => v >= lo) ?? sorted[0];
  const whiskerHi = [...sorted].reverse().find(v => v <= hi) ?? sorted[sorted.length - 1];
  const outliers  = sorted.filter(v => v < lo || v > hi);
  return { q1, med, q3, whiskerLo, whiskerHi, outliers, min: sorted[0], max: sorted[sorted.length - 1] };
}

export default function GameValueBoxplot({ rounds }) {
  const getSuitLabel = useSuitLabel();
  const stats = useMemo(() => {
    return GAME_TYPES.map(type => {
      const values = rounds
        .filter(r => r.gameType === type && r.player !== '-')
        .map(r => r.gameValue);
      return { type, stats: computeBoxStats(values), count: values.length };
    }).filter(d => d.stats !== null);
  }, [rounds]);

  if (stats.length === 0) return <p style={{ color: 'var(--outline)', textAlign: 'center', padding: '2rem' }}>Keine Daten</p>;

  const allValues = stats.flatMap(d => [d.stats.whiskerLo, d.stats.whiskerHi, ...d.stats.outliers]);
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const range     = globalMax - globalMin || 1;

  const H = 220;
  const PAD = 20;
  const plotH = H - PAD * 2;
  const colW  = 72;
  const boxW  = 36;
  const W     = stats.length * colW + 40;

  function yOf(v) { return PAD + plotH - ((v - globalMin) / range) * plotH; }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Y-Achse Referenzlinien */}
        {[0].map(v => {
          if (v < globalMin || v > globalMax) return null;
          const y = yOf(v);
          return (
            <g key={v}>
              <line x1={20} x2={W} y1={y} y2={y} stroke="var(--outline-variant)" strokeDasharray="4 3" strokeWidth={1} />
              <text x={18} y={y + 4} textAnchor="end" fontSize={9} fill="var(--outline)">0</text>
            </g>
          );
        })}

        {stats.map((d, i) => {
          const { q1, med, q3, whiskerLo, whiskerHi, outliers } = d.stats;
          const cx = 30 + i * colW + colW / 2;
          const color = SUIT_COLORS[d.type] ?? '#888';

          return (
            <g key={d.type}>
              {/* Whisker lines */}
              <line x1={cx} x2={cx} y1={yOf(whiskerHi)} y2={yOf(q3)} stroke={color} strokeWidth={1.5} />
              <line x1={cx} x2={cx} y1={yOf(q1)} y2={yOf(whiskerLo)} stroke={color} strokeWidth={1.5} />
              {/* Whisker caps */}
              <line x1={cx - 8} x2={cx + 8} y1={yOf(whiskerHi)} y2={yOf(whiskerHi)} stroke={color} strokeWidth={1.5} />
              <line x1={cx - 8} x2={cx + 8} y1={yOf(whiskerLo)} y2={yOf(whiskerLo)} stroke={color} strokeWidth={1.5} />
              {/* Box */}
              <rect
                x={cx - boxW / 2} y={yOf(q3)}
                width={boxW} height={Math.max(1, yOf(q1) - yOf(q3))}
                fill={`${color}33`} stroke={color} strokeWidth={1.5} rx={3}
              />
              {/* Median */}
              <line x1={cx - boxW / 2} x2={cx + boxW / 2} y1={yOf(med)} y2={yOf(med)} stroke={color} strokeWidth={2.5} />
              {/* Outliers */}
              {outliers.map((v, oi) => (
                <circle key={oi} cx={cx} cy={yOf(v)} r={3} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7} />
              ))}
              {/* X-Label */}
              <text x={cx} y={H - 2} textAnchor="middle" fontSize={11} fill="var(--outline)">
                {SUIT_SYMBOLS[d.type]}
              </text>
              <text x={cx} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--outline)" dy={-11}>
                {d.count}×
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legende */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {stats.map(d => (
          <span key={d.type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--outline)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: SUIT_COLORS[d.type], display: 'inline-block' }} />
            {getSuitLabel(d.type)} Ø{Math.round(d.stats.med)}
          </span>
        ))}
      </div>
    </div>
  );
}
