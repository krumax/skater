import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useSearchParams } from 'react-router-dom';
import TrophyShowcase from '../components/analytics/TrophyShowcase';
import AchievementMatrixPanel from '../components/analytics/AchievementMatrixPanel';
import { useTrophyData } from '../hooks/useTrophyData';

const TrophyShowcasePage = () => {
  const { players, rounds } = useGame();
  const [searchParams] = useSearchParams();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [showLocked, setShowLocked] = useState(true);

  useEffect(() => {
    const fromUrl = searchParams.get('player');
    if (fromUrl && players.includes(fromUrl)) {
      setSelectedPlayer(fromUrl);
    } else if (players.length > 0 && (!selectedPlayer || !players.includes(selectedPlayer))) {
      setSelectedPlayer(players[0]);
    }
  }, [players, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hook vor Early Return (Rules of Hooks)
  const {
    trophies, attackMatrix, defenseMatrix,
    levelLabel, levelEmoji,
    unlockedAttack, totalAttack,
    unlockedDefense, totalDefense,
  } = useTrophyData(players, rounds, selectedPlayer);

  if (players.length === 0) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">🏆 Pokalvitrine</h1>
          <p className="page-subtitle">Keine Spieler vorhanden.</p>
        </header>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">🏆 Pokalvitrine</h1>
        <p className="page-subtitle">Trophäen, Serien und Achievement-Fortschritt.</p>
      </header>

      {/* Spieler-Auswahl */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {players.map(name => (
          <button
            key={name}
            onClick={() => setSelectedPlayer(name)}
            className={`chip ${selectedPlayer === name ? 'active' : ''}`}
            style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* ── Pokalvitrine ── */}
      <TrophyShowcase
        playerName={selectedPlayer}
        levelLabel={levelLabel}
        levelEmoji={levelEmoji}
        trophies={trophies}
        showLocked={showLocked}
        onToggleLocked={() => setShowLocked(v => !v)}
      />

      {/* ── Achievement-Matrizen ── */}
      <div style={{ marginTop: '2.5rem' }}>
        <h2 style={{
          fontSize: '1.1rem', fontWeight: 800,
          color: 'var(--on-surface)', marginBottom: '1rem',
          letterSpacing: '0.01em',
        }}>
          Achievement-Fortschritt
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem',
        }}>
          <AchievementMatrixPanel
            matrix={attackMatrix}
            title="Angriff"
            icon="⚔️"
            unlocked={unlockedAttack}
            total={totalAttack}
            accentColor="#c8780a"
          />
          <AchievementMatrixPanel
            matrix={defenseMatrix}
            title="Abwehr"
            icon="🛡️"
            unlocked={unlockedDefense}
            total={totalDefense}
            accentColor="#1a6abf"
          />
        </div>
      </div>
    </div>
  );
};

export default TrophyShowcasePage;
