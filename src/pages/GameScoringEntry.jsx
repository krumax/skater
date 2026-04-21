import { useMemo, useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { computePlayerLevel } from '../lib/playerLevel';
import { useGameForm } from '../hooks/useGameForm';
import { useRoundCounter } from '../hooks/useRoundCounter';
import RolesBar            from '../components/scoring/RolesBar';
import PlayerSelector      from '../components/scoring/PlayerSelector';
import GameTypeSelector    from '../components/scoring/GameTypeSelector';
import ModifierChips       from '../components/scoring/ModifierChips';
import AnsageSelector      from '../components/scoring/AnsageSelector';
import SpitzenSelector     from '../components/scoring/SpitzenSelector';
import ResultDashboard     from '../components/scoring/ResultDashboard';
import ListenFortschritt  from '../components/ListenFortschritt';
import SpiellistenSelector from '../components/SpiellistenSelector';

const GameScoringEntry = () => {
  const { players, seating, addRound, currentRound, getPlayerRank, currentRoles, rounds, getPlayerTotals, getSeegerTotals, spiellisten, activeSpiellisteId, setActiveSpielliste, createSpielliste, closeSpielliste, getActiveSpiellistenForSession } = useGame();

  const form = useGameForm(currentRoles.activePlayers[0] || players[0]);
  const counter = useRoundCounter();

  const playerLevels = useMemo(() =>
    Object.fromEntries(
      players.filter(p => p !== '-').map(p => [p, computePlayerLevel(rounds, p)])
    ),
  [rounds, players]);

  const stdTotals    = getPlayerTotals();
  const seegerTotals = getSeegerTotals();

  const activeSpiellisten = getActiveSpiellistenForSession();
  const activeSpielliste = spiellisten.find(l => l.id === activeSpiellisteId) ?? null;
  const listRounds = rounds.filter(r => r.spiellisteId === activeSpiellisteId);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListeName, setNewListeName] = useState('');
  const [newListeRoundCount, setNewListeRoundCount] = useState(12);
  const [createError, setCreateError] = useState('');

  const handleCreateSpielliste = async () => {
    setCreateError('');
    try {
      await createSpielliste(newListeName, newListeRoundCount);
      setShowCreateForm(false);
      setNewListeName('');
      setNewListeRoundCount(12);
    } catch (e) {
      setCreateError(e?.message ?? 'Fehler beim Erstellen der Liste');
    }
  };

  const handleCommit = () => {
    const payload = form.buildRoundPayload();
    if (!payload) return;
    const wasActiveBock = counter.bockRoundsLeft > 0;
    // Wenn Spaltarsch: Bockrunden starten (addiert zu laufenden)
    if (form.isSpaltarsch) counter.triggerBock(seating.length);
    addRound(payload);
    form.resetForm();
    counter.increment(seating.length);
    // Nach dem Speichern einen Bockrunden-Counter herunter (nur wenn Bockrunde aktiv war)
    if (wasActiveBock) counter.decrementBock();
  };

  // Bock-Chip automatisch aktivieren/deaktivieren je nach laufenden Bockrunden
  useEffect(() => {
    if (counter.bockRoundsLeft > 0 && !form.isBock) {
      form.setIsBock(true);
    } else if (counter.bockRoundsLeft === 0 && form.isBock) {
      form.setIsBock(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter.bockRoundsLeft]);

  const rankings = getPlayerRank();
  const activePlayers = currentRoles.activePlayers.filter(n => n !== '-');

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Aktuelle Runde</h1>
        <p className="page-subtitle">Runde {currentRound} - Ergebnis dieser Runde erfassen.</p>
      </header>

      {/* Spiellisten UI */}
      {(activeSpiellisten.length > 0 || activeSpiellisteId !== null) && (
        <>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.5rem' }}>
            Aktuelle Spielserie
          </p>
          <SpiellistenSelector
            spiellisten={activeSpiellisten}
            activeId={activeSpiellisteId}
            onSelect={setActiveSpielliste}
            onCreateNew={() => setShowCreateForm(true)}
          />
        </>
      )}
      {activeSpiellisten.length === 0 && activeSpiellisteId === null && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', marginBottom: '0.5rem' }}>
            Aktuelle Spielserie
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="chip"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_circle</span>
            Neue Serie starten
          </button>
        </div>
      )}
      <ListenFortschritt spielliste={activeSpielliste} listRounds={listRounds} onClose={closeSpielliste} />

      {/* Create list form modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--surface)', borderRadius: '1rem',
            padding: '1.5rem', width: '100%', maxWidth: '400px',
            boxShadow: '0 16px 48px var(--shadow-color)',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>Neue Serie erstellen</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--outline)' }}>
                Name (optional)
              </label>
              <input
                type="text"
                value={newListeName}
                onChange={e => setNewListeName(e.target.value)}
                placeholder={`Serie ${spiellisten.length + 1}`}
                maxLength={40}
                style={{
                  width: '100%', padding: '0.625rem 0.875rem',
                  backgroundColor: 'var(--surface-low)', border: '1px solid var(--outline-variant)',
                  borderRadius: '0.5rem', color: 'var(--on-surface)',
                  fontFamily: 'inherit', fontSize: '0.9375rem', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--outline)' }}>
                Rundenzahl (3–36, Vielfaches von 3)
              </label>
              <input
                type="number"
                value={newListeRoundCount}
                onChange={e => setNewListeRoundCount(Number(e.target.value))}
                min={3} max={36} step={3}
                style={{
                  width: '100%', padding: '0.625rem 0.875rem',
                  backgroundColor: 'var(--surface-low)', border: '1px solid var(--outline-variant)',
                  borderRadius: '0.5rem', color: 'var(--on-surface)',
                  fontFamily: 'inherit', fontSize: '0.9375rem', boxSizing: 'border-box',
                }}
              />
            </div>

            {createError && (
              <p style={{ color: 'var(--secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>{createError}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreateForm(false); setCreateError(''); }}
                className="chip"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateSpielliste}
                className="chip active"
              >
                Serie erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}
           className="scoring-grid">
        <div style={{ gridColumn: '1 / -1' }}>
          <RolesBar
            seating={seating}
            step={counter.step}
            totalDeals={counter.totalDeals}
            completedRounds={counter.completedRounds(seating.length)}
            bockRoundsLeft={counter.bockRoundsLeft}
            onReset={counter.reset}
          />
        </div>
        <div>
          <PlayerSelector
            players={activePlayers}
            activePlayer={form.activePlayer}
            onSelect={form.setActivePlayer}
            playerLevels={playerLevels}
            stdTotals={stdTotals}
            seegerTotals={seegerTotals}
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
            schwarzAnnounced={form.schwarzAnnounced} setSchwarzAnnounced={form.setSchwarzAnnounced}
            ouvert={form.ouvert}                     setOuvert={form.setOuvert}
            isBock={form.isBock}                     setIsBock={form.setIsBock}
            eyeCount={form.eyeCount}                 setEyeCount={form.setEyeCount}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
               className="ansage-spitzen-grid">
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
          </div>

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
                  Der Alleinspieler hat exakt 60 Augen - Spiel verloren.
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
          lastRound={rounds.length > 0 ? rounds[rounds.length - 1] : null}
          sticky
        />
      </div>
    </div>
  );
};

export default GameScoringEntry;
