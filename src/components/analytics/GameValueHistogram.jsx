/**
 * GameValueHistogram - Histogramm der Spielwerte.
 * Zeigt die Verteilung aller Spielwerte in Bins.
 * Positive Werte (Siege) grün, negative (Niederlagen) rot.
 */
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BIN_SIZE = 24; // Bins in 24er-Schritten (Grundwert Grand)

function buildBins(rounds) {
  const values = rounds
    .filter(r => r.gameType !== 'passed' && r.player !== '-')
    .map(r => r.gameValue);
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo  = Math.floor(min / BIN_SIZE) * BIN_SIZE;
  const hi  = Math.ceil(max  / BIN_SIZE) * BIN_SIZE;

  const bins = {};
  for (let v = lo; v <= hi; v += BIN_SIZE) bins[v] = 0;
  values.forEach(v => {
    const bin = Math.floor(v / BIN_SIZE) * BIN_SIZE;
    bins[bin] = (bins[bin] || 0) + 1;
  });

  return Object.entries(bins)
    .map(([start, count]) => ({ start: Number(start), label: `${start}`, count }))
    .sort((a, b) => a.start - b.start);
}

const TooltipContent = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { start, count } = payload[0].payload;
  return (
    <div style={{ background: 'var(--surface)', padding: '0.6rem 0.9rem', borderRadius: '0.5rem', boxShadow: '0 8px 24px var(--shadow-color)', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700 }}>{start} bis {start + BIN_SIZE - 1}</p>
      <p style={{ color: 'var(--outline)' }}>{count} Spiele</p>
    </div>
  );
};

export default function GameValueHistogram({ rounds }) {
  const bins = useMemo(() => buildBins(rounds), [rounds]);
  if (bins.length === 0) return <p style={{ color: 'var(--outline)', textAlign: 'center', padding: '2rem' }}>Keine Daten</p>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={bins} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="10%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" strokeOpacity={0.35} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--outline)' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: 'var(--outline)' }} allowDecimals={false} />
        <Tooltip content={<TooltipContent />} />
        <Bar dataKey="count" name="Spiele" radius={[3, 3, 0, 0]}>
          {bins.map((b, i) => (
            <Cell key={i} fill={b.start >= 0 ? '#0b3d2e' : '#b52619'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
