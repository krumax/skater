import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { computePlayerLevel } from '../lib/playerLevel';
import { useGameForm } from '../hooks/useGameForm';
import RolesBar            from '../components/scoring/RolesBar';
import PlayerSelector      from '../components/scoring/PlayerSelector';
import GameTypeSelector    from '../components/scoring/GameTypeSelector';
import ModifierChips       from '../components/scoring/ModifierChips';
import AnsageSelector      from '../components/scoring/AnsageSelector';
import SpitzenSelector     from '../components/scoring/SpitzenSelector';
import EyeCountSelector    from '../components/scoring/EyeCountSelector';
import NullOutcomeSelector from '../components/scoring/NullOutcomeSelector';
import ResultDashboard     from '../components/scoring/ResultDashboard';

const GameScoringEntry = () => {
  const { players, seating, addRound, currentRound, getPlayerRank, currentRoles, rounds } = useGame();

  const form = useGameForm(currentRoles.activePlayers[0] || players[0]);

  const playerLevels = useMemo(() =>
    Object.fromEntries(
      players.filter(p => p !== '-').map(p => [p, computePlayerLevel(rounds, p)])
    ),
  [rounds, players]);

  const handleCommit = () => {
    const payload = form.buildRoundPayload();
    if (!payload) return;
    addRound(payload);
    form.resetForm();
  };

  const rankings = getPlayerRank();
  const activePlayers = currentRoles.activePlayers.filter(n => n !== '-');

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Neues Spielergebnis</h1>
        <p className="page-subtitle">Runde {currentRound} — Ergebnis dieser Runde erfassen.</p>
      </header>

      <RolesBar currentRoles={currentRoles} seatingCount={seating.length} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem' }}>
        <div>
          <PlayerSelector
            players={activePlayers}
            activePlayer={form.activePlayer}
            onSelect={form.setActivePlayer}
            playerLevels={playerLevels}
            disabled={form.gameType === 'passed'}
          />

          <GameTypeSelector
            gameType={form.gameType}
            onSelect={form.setGameType}
          />

          <ModifierChips
            gameType={form.gameType}
            hand={form.hand}                         setHand={form.setHand}
            schneider={form.schneider}               setSchneider={form.setSchneider}
            schneiderAnnounced={form.schneiderAnnounced} setSchneiderAnnounced={form.setSchneiderAnnounced}
            schwarz={form.schwarz}                   setSchwarz={form.setSchwarz}
            schwarzAnnounced={form.schwarzAnnounced} setSchwarzAnnounced={form.setSchwartzAnnounced}
            ouvert={form.ouvert}                     setOuvert={form.setOuvert}
            isBock={form.isBock}                     setIsBock={form.setIsBock}
          />

          <AnsageSelector
            mitOhne={form.mitOhne}   setMitOhne={form.setMitOhne}
            spitzen={form.spitzen}   setSpitzen={form.setSpitzen}
            maxSpitzen={form.maxSpitzen}
          />

          <SpitzenSelector
            gameType={form.gameType}
            spitzen={form.spitzen}
            setSpitzen={form.setSpitzen}
          />

          <EyeCountSelector
            gameType={form.gameType}
            eyeCount={form.eyeCount}
            setEyeCount={form.setEyeCount}
          />

          <NullOutcomeSelector
            gameType={form.gameType}
            eyeCount={form.eyeCount}
            setEyeCount={form.setEyeCount}
          />

          {form.isSpaltarsch && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '1rem 1.25rem', borderRadius: '0.75rem',
              backgroundColor: 'var(--secondary-container)',
              border: '1px solid var(--secondary)',
            }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>💥</span>
              <div>
                <p style={{ fontWeight: 800, color: 'var(--on-secondary-container)', marginBottom: '0.25rem' }}>
                  Spaltarsch!
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-secondary-container)', opacity: 0.85 }}>
                  Der Alleinspieler hat exakt 60 Augen — Spiel verloren.
                  Die nächsten <strong>{seating.length}</strong> Runden müssen als Bockrunde gespielt werden.
                </p>
              </div>
            </div>
          )}
        </div>

        <ResultDashboard
          result={form.result}
          outcomeLabel={form.outcomeLabel}
          gameType={form.gameType}
          isBock={form.isBock}
          rankings={rankings}
          onCommit={handleCommit}
        />
      </div>
    </div>
  );
};

export default GameScoringEntry;
