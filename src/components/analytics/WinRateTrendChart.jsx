/**
 * WinRateTrendChart — Gleitender Durchschnitt der Gewinnquote je Spieltyp.
 * Zeigt ob die Runde bestimmte Spielarten im Laufe der Zeit besser spielt.
 * Fenster: 10 Runden gleitend.
 */
import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SUIT_LABELS, SUIT_SYMBOLS } from '../../lib/skatScoring';
import { SUIT_COLORS } from '../../lib/tokens';

const GAME_TYPES = ['grand', 'club', 'spade', 'heart', 'diamond', 'null'];
const WINDOW = 10;

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', padding: '0.6rem 0.9rem', borderRadius: '0.5rem', boxShadow: '0 8px 24px var(--shadow-color)', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</p>
      {payload.map((p, i) => p.value !== null && (
        <p key={i} style={{ color: p.color }}>
          {SUIT_SYMBOLS[p.dataKey]} {SUIT_LABELS[p.dataKey]}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  );
};

export default function WinRateTrendChart({ rounds }) {
  const { data, activeTypes } = useMemo(() => {
    // Für jeden Spieltyp: nach jeder Runde gleitende Gewinnquote berechnen
    const typeRounds = {};
    GAME_TYPES.forEach(t => { typeRounds[t] = []; });

    rounds.forEach((r, idx) => {
      if (r.gameType && GAME_TYPES.includes(r.gameType) && r.player !== '-') {
        typeRounds[r.gameType].push({ idx, won: r.won });
      }
    });

    // Nur Typen mit genug Daten
    const active = GAME_TYPES.filter(t => typeRounds[t].length >= WINDOW);
    if (active.length === 0) return { data: [], activeTypes: [] };

    // Datenpunkte: nach jeder Runde (global) den gleitenden Schnitt berechnen
    const points = rounds.map((_, globalIdx) => {
      const point = { name: `R${globalIdx + 1}` };
      active.forEach(type => {
        const relevant = typeRounds[type].filter(e => e.idx <= globalIdx);
        if (relevant.length < WINDOW) { point[type] = null; return; }
        const window = relevant.slice(-WINDOW);
        point[type] = Math.round((window.filter(e => e.won).length / WINDOW) * 100);
      });
      return point;
    });

    // Nur Punkte behalten wo mindestens ein Typ einen Wert hat
    const filtered = points.filter(p => active.some(t => p[t] !== null));
    return { data: filtered, activeTypes: active };
  }, [rounds]);

  if (data.length === 0) {
    return <p style={{ color: 'var(--outline)', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
      Mindestens {WINDOW} Spiele pro Spieltyp erforderlich.
    </p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" strokeOpacity={0.35} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--outline)' }} interval={Math.floor(data.length / 6)} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--outline)' }} unit="%" />
        <Tooltip content={<TooltipContent />} />
        <Legend
          formatter={(value) => `${SUIT_SYMBOLS[value] ?? ''} ${SUIT_LABELS[value] ?? value}`}
          wrapperStyle={{ fontSize: '0.75rem' }}
        />
        {activeTypes.map(type => (
          <Line
            key={type}
            type="monotone"
            dataKey={type}
            name={type}
            stroke={SUIT_COLORS[type]}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
