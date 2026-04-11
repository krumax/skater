import React, { useMemo } from 'react';
import { useMatrixData } from '../../hooks/useMatrixData';
import { useDefenseData } from '../../hooks/useDefenseData';
import { LEVELS, getLevel } from '../../lib/playerLevel';

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <span style={{ fontSize: '2rem' }}>{lv.emoji}</span>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', display: 'block' }}>Level</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--primary)' }}>{lv.label}</span>
          </div>
        </div>
        {/* Zähler */}
        <div style={{ flexShrink: 0 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', display: 'block' }}>Achievements</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>{combined}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--outline)', marginLeft: '0.4rem' }}>({unlockedCount} Angriff · {defenseCount} Abwehr)</span>
        </div>
        {/* Fortschrittsbalken */}
        <div style={{ flex: 1, minWidth: '200px' }}>
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

      {/* Level-Legende */}
      <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {LEVELS.map((l, i) => {
          const isActive = lv.idx === i;
          const reached  = combined >= l[0];
          return (
            <div key={l[1]} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.2rem 0.6rem', borderRadius: '999px',
              backgroundColor: isActive ? 'var(--primary-container)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--primary)' : 'var(--outline-variant)'}`,
              opacity: reached ? 1 : 0.4,
            }}>
              <span style={{ fontSize: '0.75rem' }}>{l[2]}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#fff' : 'var(--on-surface-variant)' }}>{l[1]}</span>
              <span style={{ fontSize: '0.6rem', color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--outline)' }}>{l[0]}+</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
