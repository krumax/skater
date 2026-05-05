import React, { useMemo } from 'react';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/skatScoring';
import { computeShares } from '../ScoreDistributionChart';
import { SUIT_COLORS } from '../../lib/tokens';
import SuitIcon from '../SuitIcon';
import { useIconset } from '../../context/IconsetContext';

const ALTENBURG_LABELS = {
  club:    'Eichel',
  spade:   'Grün',
  heart:   'Rot',
  diamond: 'Schellen',
};

const CX = 110, CY = 110, R = 100, RI = 52;

function donutArcPath(startAngle, endAngle) {
  const cos1 = Math.cos(startAngle - Math.PI / 2), sin1 = Math.sin(startAngle - Math.PI / 2);
  const cos2 = Math.cos(endAngle   - Math.PI / 2), sin2 = Math.sin(endAngle   - Math.PI / 2);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${CX + R  * cos1} ${CY + R  * sin1}`,
    `A ${R}  ${R}  0 ${largeArc} 1 ${CX + R  * cos2} ${CY + R  * sin2}`,
    `L ${CX + RI * cos2} ${CY + RI * sin2}`,
    `A ${RI} ${RI} 0 ${largeArc} 0 ${CX + RI * cos1} ${CY + RI * sin1}`,
    'Z',
  ].join(' ');
}

export default function GameTypePieChart({ typeDistribution, rounds, player }) {
  const { iconset } = useIconset();
  const getSuitLabel = (type) =>
    iconset === 'altenburg' && type in ALTENBURG_LABELS
      ? ALTENBURG_LABELS[type]
      : (SUIT_LABELS[type] ?? type);

  const scores   = Object.fromEntries(typeDistribution.map(({ type, count }) => [type, count]));
  const colorMap = Object.fromEntries(typeDistribution.map(({ type }) => [type, SUIT_COLORS[type] ?? '#999']));
  const slices   = computeShares(scores, colorMap);
  const isSingle = slices.length === 1;

  const winRates = useMemo(() => {
    const map = {};
    typeDistribution.forEach(({ type }) => {
      const games = player
        ? rounds.filter(r => r.player === player && r.gameType === type)
        : rounds.filter(r => r.gameType === type);
      const wins  = games.filter(r => r.won).length;
      map[type] = games.length > 0 ? Math.round((wins / games.length) * 100) : null;
    });
    return map;
  }, [rounds, player, typeDistribution]);

  let cumAngle = 0;
  const paths = slices.map(s => {
    const startAngle = cumAngle;
    const sweepAngle = (s.share / 100) * 2 * Math.PI;
    cumAngle += sweepAngle;
    return { ...s, startAngle, endAngle: cumAngle };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <svg viewBox="0 0 220 220" width="300" height="300" aria-label="Spielart-Verteilung">
        {isSingle ? (
          <>
            <circle cx={CX} cy={CY} r={R} fill={slices[0].color} />
            <circle cx={CX} cy={CY} r={RI} fill="white" />
          </>
        ) : (
          paths.map(s => <path key={s.name} d={donutArcPath(s.startAngle, s.endAngle)} fill={s.color} />)
        )}
        {paths.map(s => {
          if (s.share < 5) return null;
          const midAngle = s.startAngle + (s.endAngle - s.startAngle) / 2;
          const labelR = (R + RI) / 2;
          const lx = CX + labelR * Math.cos(midAngle - Math.PI / 2);
          const ly = CY + labelR * Math.sin(midAngle - Math.PI / 2);
          const label = s.name === 'grand' ? '★' : s.name === 'null' ? '∅' : s.name === 'passed' ? '⏸' : (SUIT_SYMBOLS[s.name] ?? SUIT_LABELS[s.name] ?? s.name);
          return (
            <text key={`lbl-${s.name}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#fff" fontWeight="bold">
              <tspan x={lx} dy="-5">{label}</tspan>
              <tspan x={lx} dy="13">{s.share}%</tspan>
            </text>
          );
        })}
        <circle cx={CX} cy={CY} r={RI} fill="white" />
        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="800" fill="var(--on-surface)" fontFamily="Manrope, sans-serif">
          {typeDistribution.reduce((s, t) => s + t.count, 0)}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="var(--outline)" letterSpacing="0.1em" style={{ textTransform: 'uppercase' }}>
          SPIELE
        </text>
      </svg>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', paddingBottom: '0.375rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)' }}>Anteil</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)' }}>Gewinnrate</span>
        </div>
        {slices.map(s => {
          const rate = winRates[s.name];
          return (
            <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <SuitIcon gameType={s.name} size="sm" />
                  {getSuitLabel(s.name)}
                </span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '0.75rem' }}>{s.share}%</span>
              </div>
              {rate !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ flex: 1, height: '8px', borderRadius: '999px', overflow: 'hidden', display: 'flex', backgroundColor: 'var(--surface-high)' }}>
                    <div style={{ width: `${rate}%`, backgroundColor: '#2e7d32', transition: 'width 0.4s ease' }} />
                    <div style={{ flex: 1, backgroundColor: '#d84315' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: rate >= 50 ? '#2e7d32' : '#d84315', minWidth: '2.5rem', textAlign: 'right' }}>{rate}%</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>—</span>
              )}
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: '1rem', paddingTop: '0.375rem', borderTop: '1px solid var(--outline-variant)' }}>
          {[['#2e7d32', 'Gewonnen'], ['#d84315', 'Verloren']].map(([color, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />{label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
