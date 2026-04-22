import { useGame } from '../context/GameContext';

// Feature: score-distribution-chart
export const PLAYER_COLORS = ['#6750A4', '#B5838D', '#52B788', '#F4A261'];

/**
 * computeShares – pure helper (exported for tests)
 * @param {Record<string, number>} scores
 * @param {Record<string, string>} playerColors
 * @returns {Array<{name, value, share, color}>}
 */
export function computeShares(scores, playerColors) {
  const positive = Object.entries(scores).filter(([, v]) => v > 0);
  if (positive.length === 0) return [];
  const sumPositive = positive.reduce((s, [, v]) => s + v, 0);
  return positive.map(([name, value]) => ({
    name,
    value,
    share: Math.round((value / sumPositive) * 1000) / 10,
    color: playerColors[name] ?? '#999',
  }));
}

const CX = 100, CY = 100, R = 80;

function arcPath(startAngle, endAngle) {
  const x1 = CX + R * Math.sin(startAngle);
  const y1 = CY - R * Math.cos(startAngle);
  const x2 = CX + R * Math.sin(endAngle);
  const y2 = CY - R * Math.cos(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function PieChart({ slices, title, tooltip }) {
  if (slices.length === 0) {
    return (
      <div className="pie-chart-container">
        <h3 className="pie-chart-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
          {title}
          {tooltip && (
            <span
              className="material-symbols-outlined"
              title={tooltip}
              style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, fontVariationSettings: "'FILL' 0" }}
            >info</span>
          )}
        </h3>
        <p className="pie-chart-empty">Keine positiven Punkte vorhanden</p>
      </div>
    );
  }

  const isSingle = slices.length === 1;
  let cumAngle = 0;
  const paths = slices.map((slice) => {
    const startAngle = cumAngle;
    const sweepAngle = (slice.share / 100) * 2 * Math.PI;
    cumAngle += sweepAngle;
    return { ...slice, startAngle, endAngle: cumAngle };
  });

  return (
    <div className="pie-chart-container">
      <h3 className="pie-chart-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
        {title}
        {tooltip && (
          <span
            className="material-symbols-outlined"
            title={tooltip}
            style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, fontVariationSettings: "'FILL' 0" }}
          >info</span>
        )}
      </h3>
      <svg viewBox="0 0 200 200" width="200" height="200" aria-label={title}>
        {isSingle ? (
          <circle cx={CX} cy={CY} r={R} fill={slices[0].color} />
        ) : (
          paths.map((s) => (
            <path key={s.name} d={arcPath(s.startAngle, s.endAngle)} fill={s.color} />
          ))
        )}
        {paths.map((s) => {
          if (s.share < 5) return null;
          const midAngle = s.startAngle + (s.endAngle - s.startAngle) / 2;
          const labelR = R * 0.65;
          const lx = CX + labelR * Math.sin(midAngle);
          const ly = CY - labelR * Math.cos(midAngle);
          return (
            <text key={`label-${s.name}`} x={lx} y={ly} textAnchor="middle"
              dominantBaseline="middle" fontSize="9" fill="#fff" fontWeight="bold">
              <tspan x={lx} dy="-5">{s.name}</tspan>
              <tspan x={lx} dy="12">{s.share}%</tspan>
            </text>
          );
        })}
      </svg>
      <ul className="pie-chart-legend">
        {slices.map((s) => (
          <li key={s.name} className="pie-chart-legend-item">
            <span className="pie-chart-legend-color" style={{ background: s.color }} />
            <span>{s.name}</span>
            <span className="pie-chart-legend-share">{s.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ScoreDistributionChart() {
  const { rounds, seating, getPlayerTotals, getSeegerTotals } = useGame();

  if (rounds.length === 0) {
    return <p className="score-dist-empty">Noch keine Runden gespielt.</p>;
  }

  const playerColors = {};
  seating.forEach((name, i) => {
    playerColors[name] = PLAYER_COLORS[i % PLAYER_COLORS.length];
  });

  const standardScores = getPlayerTotals();
  const seegerScores = getSeegerTotals();
  const combinedScores = {};
  seating.forEach((name) => {
    combinedScores[name] = (standardScores[name] ?? 0) + (seegerScores[name] ?? 0);
  });

  return (
    <div className="score-distribution-chart">
      <PieChart slices={computeShares(standardScores, playerColors)} title="Gesamtpunkte" />
      <PieChart slices={computeShares(seegerScores, playerColors)} title="Seeger-Fabian" tooltip="Turnierwertung nach Seeger-Fabian: Alleinspieler gewinnt/verliert ±50 Punkte, jeder Gegner ±40 Punkte – unabhängig vom Spielwert." />
      <PieChart slices={computeShares(combinedScores, playerColors)} title="Kombiniert" tooltip="Summe aus Standardpunkten und Seeger-Fabian-Punkten." />
    </div>
  );
}
