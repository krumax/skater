import React, { useMemo } from 'react';
import { useMatrixData } from '../../hooks/useMatrixData';
import { useDefenseData } from '../../hooks/useDefenseData';
import { LEVELS, getLevel } from '../../lib/playerLevel';
import LevelGauge from './LevelGauge';

export default function AchievementCompletionCard({ rounds, player }) {
  const { unlockedCount, totalPossible, percent } = useMatrixData(rounds, player);
  const { map: defMap } = useDefenseData(rounds, player);

  const defenseCount = useMemo(() => {
    let c = 0;
    Object.values(defMap).forEach(row => { c += Object.keys(row).length; });
    return c;
  }, [defMap]);

  const combined = unlockedCount + defenseCount;
  const lv = getLevel(combined);
  const nextThreshold = lv.next ? lv.next.min : null;
  const toNext = nextThreshold ? nextThreshold - combined : 0;

  return (
    <div className="card" style={{ border: '1px solid var(--outline-variant)', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Gauge */}
        <LevelGauge combined={combined} lv={lv} />

        {/* Mitte: Zähler + Fortschrittsbalken */}
        <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', display: 'block' }}>⚔️ Angriff</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>{unlockedCount}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', display: 'block' }}>🛡️ Abwehr</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>{defenseCount}</span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{percent}% der Alleinspieler-Matrix</span>
              {nextThreshold && (
                <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>
                  noch {toNext} bis {lv.next.label} {lv.next.emoji}
                </span>
              )}
            </div>
            <div style={{ width: '100%', backgroundColor: 'var(--surface-low)', height: '0.5rem', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'var(--primary)', height: '100%', width: `${percent}%`, borderRadius: '999px' }} />
            </div>
          </div>
        </div>

        {/* Rechts: Level-Legende */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
          {LEVELS.map((l, i) => {
            const isActive = lv.idx === i;
            const reached  = combined >= l[0];
            return (
              <div key={l[1]} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.15rem 0.6rem', borderRadius: '999px',
                backgroundColor: isActive ? '#d0a600' : 'transparent',
                border: `1px solid ${isActive ? '#d0a600' : 'var(--outline-variant)'}`,
                opacity: reached ? 1 : 0.35,
              }}>
                <span style={{ fontSize: '0.75rem' }}>{l[2]}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#1b1c1c' : 'var(--on-surface-variant)' }}>{l[1]}</span>
                <span style={{ fontSize: '0.6rem', color: isActive ? 'rgba(27,28,28,0.6)' : 'var(--outline)' }}>{l[0]}+</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
