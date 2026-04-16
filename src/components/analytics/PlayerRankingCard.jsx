/**
 * PlayerRankingCard — zeigt das kategorie-basierte Ranking eines Spielers.
 * Drei Kategorien: Farbspiel, Null, Grand — je mit Ring-Fortschritt und Tier-Liste.
 */
import { useMemo } from 'react';
import {
  RANK_TIERS, RANK_THRESHOLDS, CATEGORY_META,
  computeCategoryRank, computeCategoryWins,
} from '../../lib/playerRanking';

// ── Ring-SVG ──────────────────────────────────────────────────────────────────
const SIZE = 120;
const CX = SIZE / 2, CY = SIZE / 2;
const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

function RankRing({ progressPct, color, label, sublabel, wins, totalLabel }) {
  const dash = (progressPct / 100) * CIRCUMFERENCE;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ cursor: 'help' }}>
        <title>{`${totalLabel}: ${wins} gewonnene Spiele`}</title>
        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface-low)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Center text */}
        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", fill: 'var(--on-surface)' }}>
          {progressPct}%
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fill: 'var(--outline)' }}>
          {sublabel}
        </text>
      </svg>
    </div>
  );
}

// ── Tier-Zeile ────────────────────────────────────────────────────────────────
function TierRow({ tier, threshold, wins, isActive, isNext, isReached, unit }) {
  let barPct;
  if (isActive) {
    barPct = 100; // vollständig erreicht
  } else if (isNext) {
    // Fortschritt innerhalb dieses Tiers (aktuell in Arbeit)
    const from = threshold.prevWins ?? 0;
    const to   = threshold.wins;
    barPct = Math.min(100, Math.round(((wins - from) / (to - from)) * 100));
  } else if (isReached) {
    barPct = 100;
  } else {
    barPct = 0;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
      backgroundColor: isNext ? `${tier.color}22` : 'transparent',
      border: isNext ? `1px solid ${tier.color}66` : '1px solid transparent',
      opacity: isReached || isNext ? 1 : 0.4,
    }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{tier.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: isNext ? 800 : 600, color: isNext ? tier.color : 'var(--on-surface-variant)' }}>
            {tier.label}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isNext ? tier.color : 'var(--outline)' }}>
            {threshold.wins} {unit ?? 'Siege'}
          </span>
        </div>
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-low)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${barPct}%`,
            backgroundColor: tier.color,
            borderRadius: '999px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

// ── Kategorie-Karte ───────────────────────────────────────────────────────────
function CategoryCard({ category, wins, unit }) {
  const meta = CATEGORY_META[category];
  const rank = computeCategoryRank(wins, category);
  const thresholds = RANK_THRESHOLDS[category];

  // Schwellenwerte mit prevWins anreichern
  const enriched = thresholds.map((t, i) => ({
    ...t,
    prevWins: i === 0 ? 0 : thresholds[i - 1].wins,
  }));

  const ringLabel = rank.nextTier
    ? `ZU ${rank.nextTier.label.toUpperCase()}`
    : 'LEGENDE';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h4 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.1rem' }}>{meta.label}</h4>
          <p style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{meta.subtitle}</p>
        </div>
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
          backgroundColor: `${meta.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: meta.color }}>{meta.matIcon}</span>
        </div>
      </div>

      {/* Ring */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <RankRing
          progressPct={rank.progressPct}
          color={rank.nextTier?.color ?? rank.currentTier?.color ?? meta.color}
          sublabel={ringLabel}
          wins={wins}
          totalLabel={meta.label}
        />
      </div>

      {/* Tier-Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {enriched.map(threshold => {
          const tier = RANK_TIERS.find(t => t.id === threshold.tier);
          const isReached = wins >= threshold.wins;
          const isActive  = isReached && rank.currentTier?.id === threshold.tier;
          const isNext    = !isReached && rank.nextTier?.id === threshold.tier;
          return (
            <TierRow
              key={threshold.tier}
              tier={tier}
              threshold={threshold}
              wins={wins}
              isActive={isActive}
              isNext={isNext}
              isReached={isReached}
              unit={unit}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function PlayerRankingCard({ rounds, player }) {
  const wins = useMemo(() => computeCategoryWins(rounds, player), [rounds, player]);

  return (
    <div className="analytics-ranking-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem' }}>
      <CategoryCard category="farbspiel" wins={wins.farbspiel} />
      <CategoryCard category="null"      wins={wins.null} />
      <CategoryCard category="grand"     wins={wins.grand} />
      <CategoryCard category="gesamt"    wins={wins.gesamt} unit="Spiele" />
    </div>
  );
}
