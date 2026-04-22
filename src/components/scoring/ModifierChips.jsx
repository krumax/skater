/**
 * ModifierChips - Spielstufe-Chips (Hand, Schneider, Schwarz, Ouvert, Bockrunde).
 * Disabled-Logik basiert auf gameType und hand-Status.
 * Enthält auch Ergebnis-Chips: Verloren (<61) und Spaltarsch (60).
 */
export default function ModifierChips({
  gameType, hand, setHand,
  schneider, setSchneider,
  schneiderAnnounced, setSchneiderAnnounced,
  schwarz, setSchwarz,
  schwarzAnnounced, setSchwarzAnnounced,
  ouvert, setOuvert,
  isBock, setIsBock,
  eyeCount, setEyeCount,
}) {
  const isPassed   = gameType === 'passed';
  const isNull     = gameType === 'null';
  const isSuitGame = ['club', 'spade', 'heart', 'diamond', 'grand'].includes(gameType);

  const modifiers = [
    { key: 'hand',               label: 'Hand',               state: hand,               setter: setHand,               disabled: isPassed },
    { 
      key: 'schneider',          
      label: 'Schneider',          
      state: schneider,          
      setter: (val) => { setSchneider(val); if (!val) { setSchwarz(false); setSchwarzAnnounced(false); setSchneiderAnnounced(false); } }, 
      disabled: isPassed || isNull 
    },
    { 
      key: 'schneiderAnnounced', 
      label: 'Schneider angesagt', 
      state: schneiderAnnounced, 
      setter: (val) => { setSchneiderAnnounced(val); if (val) setSchneider(true); else setSchwarzAnnounced(false); }, 
      disabled: isPassed || isNull || !hand 
    },
    { 
      key: 'schwarz',            
      label: 'Schwarz',            
      state: schwarz,            
      setter: (val) => { setSchwarz(val); if (val) setSchneider(true); else setSchwarzAnnounced(false); }, 
      disabled: isPassed || isNull 
    },
    { 
      key: 'schwarzAnnounced',   
      label: 'Schwarz angesagt',   
      state: schwarzAnnounced,   
      setter: (val) => { setSchwarzAnnounced(val); if (val) { setSchwarz(true); setSchneiderAnnounced(true); setSchneider(true); } }, 
      disabled: isPassed || isNull || !hand 
    },
    { key: 'ouvert',             label: 'Ouvert',             state: ouvert,             setter: setOuvert,             disabled: isPassed || (!isNull && !hand) },
  ];

  const isVerloren    = isSuitGame && eyeCount < 61 && eyeCount !== 60;
  const isSpaltarsch  = isSuitGame && eyeCount === 60;

  return (
    <section className="form-section">
      <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      Spielstufe
      <span
        className="material-symbols-outlined"
        title="Jeder aktive Modifikator erhöht die Gewinnstufe um 1. Hand = ohne Skat gespielt. Schneider = Gegner unter 30 Augen. Schwarz = Gegner ohne Stich. Ouvert = Karten offen gelegt."
        style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, fontVariationSettings: "'FILL' 0" }}
      >info</span>
    </label>
      <div className="chip-grid">
        {modifiers.map(mod => (
          <button
            key={mod.key}
            disabled={mod.disabled}
            onClick={() => mod.setter(!mod.state)}
            className={`chip ${mod.state && !mod.disabled ? 'active' : ''}`}
            style={{ opacity: mod.disabled ? 0.4 : 1, pointerEvents: mod.disabled ? 'none' : 'auto' }}
          >
            {mod.label}
          </button>
        ))}
        <button
          disabled={isPassed}
          onClick={() => setIsBock(!isBock)}
          className={`chip ${isBock && !isPassed ? 'active' : ''}`}
          style={{ opacity: isPassed ? 0.4 : 1, pointerEvents: isPassed ? 'none' : 'auto' }}
          title="Bockrunde: Der Spielwert wird verdoppelt. Wird ausgelöst durch Spaltarsch (60 Augen), Ramsch oder andere Sonderregeln."
        >
          Bockrunde
        </button>

        {/* Ergebnis-Chips - nur bei Farb-/Grand-Spielen */}
        <button
          disabled={!isSuitGame}
          onClick={() => setEyeCount(isVerloren ? 61 : 30)}
          className={`chip ${isVerloren ? 'active' : ''}`}
          style={{
            opacity: isSuitGame ? 1 : 0.4,
            pointerEvents: isSuitGame ? 'auto' : 'none',
            ...(isVerloren
              ? { backgroundColor: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' }
              : { color: 'var(--secondary)' }),
          }}
        >
          Verloren (&lt;61)
        </button>
        <button
          disabled={!isSuitGame}
          onClick={() => setEyeCount(isSpaltarsch ? 61 : 60)}
          className={`chip ${isSpaltarsch ? 'active' : ''}`}
          title="Spaltarsch: exakt 60 Augen - Spiel verloren, nächste Runden als Bockrunde"
          style={{
            opacity: isSuitGame ? 1 : 0.4,
            pointerEvents: isSuitGame ? 'auto' : 'none',
            ...(isSpaltarsch
              ? { backgroundColor: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' }
              : { color: 'var(--secondary)' }),
          }}
        >
          💥 Spaltarsch (60)
        </button>

        {/* Null-Ergebnis-Chips - nur bei Null-Spiel */}
        <button
          disabled={!isNull}
          onClick={() => setEyeCount(0)}
          className={`chip ${isNull && eyeCount === 0 ? 'active' : ''}`}
          style={{ opacity: isNull ? 1 : 0.4, pointerEvents: isNull ? 'auto' : 'none' }}
        >
          Null gewonnen
        </button>
        <button
          disabled={!isNull}
          onClick={() => setEyeCount(1)}
          className={`chip ${isNull && eyeCount !== 0 ? 'active' : ''}`}
          style={{
            opacity: isNull ? 1 : 0.4,
            pointerEvents: isNull ? 'auto' : 'none',
            ...(isNull && eyeCount !== 0
              ? { backgroundColor: 'var(--secondary)', color: '#fff', borderColor: 'var(--secondary)' }
              : { color: 'var(--secondary)' }),
          }}
        >
          Null verloren
        </button>
      </div>
    </section>
  );
}
