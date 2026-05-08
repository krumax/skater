import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  // Empty state: no table set up yet (fewer than 3 players in seating)
  if (seating.length < 3) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">Aktuelle Runde</h1>
          <p className="page-subtitle">Noch kein Tisch eingerichtet.</p>
        </header>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '3rem 1.5rem', gap: '2rem',
          backgroundColor: 'var(--surface-low)', borderRadius: '1rem',
          border: '1px dashed var(--outline-variant)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline)', opacity: 0.5 }}>table_bar</span>
          <div>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.5rem' }}>Kein Tisch eingerichtet</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--outline)', lineHeight: 1.6, maxWidth: '340px' }}>
              Lege zuerst einen Tisch mit 3–4 Spielern an. Danach kannst du hier Runden erfassen und Punkte tracken.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px' }}>
            {[
              {
                step: '1',
                label: 'Tisch & Spieler anlegen',
                desc: 'Namen eingeben, Geber festlegen und Sitzreihenfolge bestimmen.',
                icon: 'group_add',
                color: 'var(--primary)',
              },
              {
                step: '2',
                label: 'Spielwerte nach jeder Runde eintragen',
                desc: 'Ihr spielt offline Karten – nach jedem Spiel trägst du Spielart, Spitzen und Ergebnis ein. So wie früher mit Stift und Zettel.',
                icon: 'edit_note',
                color: 'var(--tertiary)',
              },
              {
                step: '3',
                label: 'Statistiken & Achievements',
                desc: 'Punkte, Siegquoten und Errungenschaften werden automatisch berechnet.',
                icon: 'bar_chart',
                color: '#52B788',
              },
            ].map(({ step, label, desc, icon, color }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1rem', backgroundColor: 'var(--surface)', borderRadius: '0.75rem', textAlign: 'left' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color }}>{icon}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>{label}</span>
                  <span style={{ fontSize: '0.775rem', color: 'var(--outline)', lineHeight: 1.5 }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to="/players" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', textDecoration: 'none', borderRadius: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add_circle</span>
            Tisch einrichten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Aktuelle Runde</h1>
        <p className="page-subtitle">Runde {currentRound} - Ergebnis dieser Runde erfassen.</p>
      </header>

      {/* Ablauf-Schritte */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1.25rem', flexWrap: 'wrap',
      }}>
        {[
          { n: '1', label: 'Alleinspieler wählen' },
          { n: '2', label: 'Spielwert konfigurieren' },
          { n: '3', label: 'Ergebnis speichern' },
        ].flatMap(({ n, label }, i, arr) => {
          const chip = (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.35rem 0.75rem 0.35rem 0.4rem',
              backgroundColor: 'var(--surface-low)', borderRadius: '2rem',
              border: '1px solid var(--outline-variant)',
            }}>
              <span style={{
                width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                backgroundColor: 'var(--primary)', color: '#fff',
                fontSize: '0.65rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{n}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          );
          if (i < arr.length - 1) {
            return [chip, <span key={`arrow-${n}`} className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: 'var(--outline)', flexShrink: 0 }}>arrow_forward</span>];
          }
          return [chip];
        })}
        <Link to="/info" style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--outline)',
          textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>menu_book</span>
          Regelwerk
        </Link>
      </div>

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
              <div style={{
                display: 'flex', alignItems: 'center',
                backgroundColor: 'var(--surface-low)', border: '1px solid var(--outline-variant)',
                borderRadius: '0.5rem', overflow: 'hidden',
              }}>
                <button
                  type="button"
                  onClick={() => setNewListeRoundCount(v => Math.max(3, v - 3))}
                  disabled={newListeRoundCount <= 3}
                  style={{
                    padding: '0.625rem 0.875rem', background: 'none', border: 'none',
                    color: newListeRoundCount <= 3 ? 'var(--outline-variant)' : 'var(--on-surface)',
                    cursor: newListeRoundCount <= 3 ? 'default' : 'pointer',
                    fontSize: '1.25rem', lineHeight: 1, flexShrink: 0,
                  }}
                  aria-label="Rundenzahl verringern"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', display: 'block' }}>keyboard_arrow_down</span>
                </button>
                <span style={{
                  flex: 1, textAlign: 'center', fontFamily: 'inherit',
                  fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface)',
                  userSelect: 'none',
                }}>
                  {newListeRoundCount}
                </span>
                <button
                  type="button"
                  onClick={() => setNewListeRoundCount(v => Math.min(36, v + 3))}
                  disabled={newListeRoundCount >= 36}
                  style={{
                    padding: '0.625rem 0.875rem', background: 'none', border: 'none',
                    color: newListeRoundCount >= 36 ? 'var(--outline-variant)' : 'var(--on-surface)',
                    cursor: newListeRoundCount >= 36 ? 'default' : 'pointer',
                    fontSize: '1.25rem', lineHeight: 1, flexShrink: 0,
                  }}
                  aria-label="Rundenzahl erhöhen"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', display: 'block' }}>keyboard_arrow_up</span>
                </button>
              </div>
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
          activePlayer={form.gameType === 'passed' ? null : form.activePlayer}
          sticky
        />
      </div>
    </div>
  );
};

export default GameScoringEntry;
