/**
 * LevelGauge - segmentierter Ring-Fortschrittsanzeiger für das Spieler-Level.
 *
 * Der Ring besteht aus N Segmenten (eines pro Level-Stufe).
 * Vollständig erreichte Level sind voll gefärbt, das aktuelle Level
 * zeigt den Teilfortschritt, zukünftige Level sind ausgeblendet.
 * Die Achievement-Zahl steht in der Mitte.
 */

import { useMemo } from 'react';
import { LEVELS } from '../../lib/playerLevel';

const GOLD = '#d0a600';
const GOLD_DIM = '#a07800';

const SIZE        = 160;   // SVG viewport
const CX          = SIZE / 2;
const CY          = SIZE / 2;
const R_OUTER     = 72;
const R_INNER     = 54;
const GAP_DEG     = 4;
const START_DEG   = 200;   // Beginn unten-links
const END_DEG     = 340;   // Ende unten-rechts - Lücke = 40° unten
const TOTAL_ARC   = 320;   // 360 - 40° Lücke

function toRad(deg) { return (deg * Math.PI) / 180; }

function polarToXY(cx, cy, r, deg) {
  const rad = toRad(deg - 90); // 0° = oben
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  const o1 = polarToXY(cx, cy, rOuter, startDeg);
  const o2 = polarToXY(cx, cy, rOuter, endDeg);
  const i1 = polarToXY(cx, cy, rInner, endDeg);
  const i2 = polarToXY(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

export default function LevelGauge({ combined, lv }) {
  const segments = useMemo(() => {
    const n = LEVELS.length; // 9 Level-Stufen
    const arcPerSegment = (TOTAL_ARC - GAP_DEG * n) / n;

    return LEVELS.map((level, i) => {
      const segStart = START_DEG + i * (arcPerSegment + GAP_DEG);
      const segEnd   = segStart + arcPerSegment;

      const levelMin  = level[0];
      const levelMax  = LEVELS[i + 1]?.[0] ?? (levelMin + 20); // letztes Level: +20 als Annahme

      // Wie viel dieses Segments ist gefüllt? (0–1)
      let fill;
      if (combined >= levelMax) {
        fill = 1; // vollständig erreicht
      } else if (combined >= levelMin) {
        fill = (combined - levelMin) / (levelMax - levelMin); // Teilfortschritt
      } else {
        fill = 0; // noch nicht erreicht
      }

      const isActive  = lv.idx === i;
      const isReached = combined >= levelMin;

      // Farbe: aktives Level = gold, erreicht = gold (gedimmt), nicht erreicht = outline-variant
      let color;
      if (isActive)       color = GOLD;
      else if (isReached) color = GOLD_DIM;
      else                color = 'var(--outline-variant)';

      // Hintergrund-Segment (immer sichtbar, gedimmt)
      const bgPath   = segmentPath(CX, CY, R_OUTER, R_INNER, segStart, segEnd);

      // Vordergrund-Segment (gefüllter Anteil)
      const fillEnd  = segStart + arcPerSegment * fill;
      const fgPath   = fill > 0
        ? segmentPath(CX, CY, R_OUTER, R_INNER, segStart, fillEnd)
        : null;

      return { i, bgPath, fgPath, color, isActive, isReached, fill, label: level[2] };
    });
  }, [combined, lv.idx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: 'visible' }}>
        {segments.map(seg => (
          <g key={seg.i}>
            {/* Hintergrund */}
            <path d={seg.bgPath} fill="var(--surface-low)" stroke="var(--surface)" strokeWidth="1" />
            {/* Fortschritt */}
            {seg.fgPath && (
              <path
                d={seg.fgPath}
                fill={seg.color}
                opacity={seg.isActive ? 1 : 0.55}
                stroke="var(--surface)"
                strokeWidth="1"
              />
            )}
          </g>
        ))}

        {/* Mittlerer Kreis */}
        <circle cx={CX} cy={CY} r={R_INNER - 4} fill="var(--surface-low)" />
        <circle cx={CX} cy={CY} r={R_INNER - 4} fill="none" stroke="var(--outline-variant)" strokeWidth="1" />

        {/* Achievement-Zahl */}
        <text
          x={CX} y={CY - 6}
          textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", fill: 'var(--on-surface)' }}
        >
          {combined}
        </text>

        {/* Level-Emoji */}
        <text
          x={CX} y={CY + 16}
          textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '0.9rem', fill: 'var(--on-surface)' }}
        >
          {lv.emoji}
        </text>
      </svg>

      {/* Level-Label unter dem Ring */}
      <div style={{
        backgroundColor: GOLD,
        color: '#1b1c1c',
        borderRadius: '999px',
        padding: '0.2rem 0.9rem',
        fontSize: '0.7rem',
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginTop: '-0.5rem',
      }}>
        {lv.label}
      </div>
    </div>
  );
}
