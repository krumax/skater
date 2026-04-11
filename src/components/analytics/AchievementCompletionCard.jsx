import React, { useMemo } from 'react';
import { useMatrixData } from '../../hooks/useMatrixData';
import { useDefenseData } from '../../hooks/useDefenseData';
import { LEVELS, getLevel } from '../../lib/playerLevel';
import { PLAYER_COLORS } from '../../lib/tokens';import LevelGauge from './LevelGauge';

const BASE_STEP = 500;
const MAX_STEPS = 10; // bis 5000

function computeMaxWins(wins) {
  for (let i = 1; i <= MAX_STEPS; i++) {
    if (wins < BASE_STEP * i) return BASE_STEP * i;
  }
  return BASE_STEP * MAX_STEPS;
}

export default function AchievementCompletionCard({ rounds, player, allPlayers = [], getPlayerStats }) {
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

  // Siege aller Spieler für den Vergleichsbalken
  const playerWins = useMemo(() => {
    if (!getPlayerStats || allPlayers.length === 0) return [];
    const grays = ['#9e9e9e', '#bdbdbd', '#757575', '#b0b0b0'];
    let grayIdx = 0;
    return allPlayers.map((name) => ({
      name,
      wins: getPlayerStats(name).wins,
      color: name === player ? '#d0a600' : grays[grayIdx++ % grays.length],
      isSelected: name === player,
    }));
  }, [allPlayers, player, getPlayerStats]);

  const maxWins = useMemo(() => {
    const top = Math.max(0, ...playerWins.map(p => p.wins));
    return computeMaxWins(top);
  }, [playerWins]);

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
            <div style={{ width: '100%', backgroundColor: 'var(--surface-low)', height: '0.75rem', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'var(--primary)', height: '100%', width: `${percent}%`, borderRadius: '999px' }} />
            </div>
          </div>

          {/* Gewonnene Spiele — Vergleichsbalken dynamisch */}
          {playerWins.length > 0 && (() => {
            const sel = playerWins.find(p => p.isSelected);
            const selWins = sel?.wins ?? 0;
            const selTotal = getPlayerStats ? getPlayerStats(player).totalGames : 0;
            const selLosses = selTotal - selWins;
            const winPct  = selTotal > 0 ? (selWins  / selTotal) * 100 : 0;
            const lossPct = selTotal > 0 ? (selLosses / selTotal) * 100 : 0;
            return (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>Gewonnene Spiele</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>Ziel: {maxWins}</span>
                  </div>
                  <div style={{ position: 'relative', width: '100%', backgroundColor: 'var(--surface-low)', height: '0.75rem', borderRadius: '999px', overflow: 'hidden' }}>
                    {[...playerWins].sort((a, b) => b.wins - a.wins).map(p => (
                      <div key={p.name} style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${Math.min((p.wins / maxWins) * 100, 100)}%`,
                        backgroundColor: p.color, borderRadius: '999px',
                        opacity: p.isSelected ? 1 : 0.5, transition: 'width 0.4s ease',
                      }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginTop: '0.5rem' }}>
                    {[...playerWins].sort((a, b) => b.wins - a.wins).map(p => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{
                          width: '0.55rem', height: '0.55rem', borderRadius: '50%',
                          backgroundColor: p.color, flexShrink: 0,
                          boxShadow: p.isSelected ? `0 0 0 2px ${p.color}44` : 'none',
                        }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: p.isSelected ? 800 : 500, color: p.isSelected ? 'var(--on-surface)' : 'var(--outline)', whiteSpace: 'nowrap' }}>
                          {p.name} — {p.wins}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sieg/Niederlage-Anteil des ausgewählten Spielers */}
                {selTotal > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>Sieg / Niederlage</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--outline)' }}>{selWins}S · {selLosses}N · {selTotal} gespielt</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: 'var(--surface-low)', height: '0.75rem', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${winPct}%`,  backgroundColor: '#0b3d2e',            borderRadius: '999px 0 0 999px', transition: 'width 0.4s ease' }} />
                      <div style={{ width: `${lossPct}%`, backgroundColor: 'var(--secondary)', borderRadius: '0 999px 999px 0', transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', backgroundColor: '#0b3d2e', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>Siege {winPct.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ width: '0.55rem', height: '0.55rem', borderRadius: '50%', backgroundColor: 'var(--secondary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--outline)', whiteSpace: 'nowrap' }}>Niederlagen {lossPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
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
