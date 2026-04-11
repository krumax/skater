/**
 * ModifierChips — Spielstufe-Chips (Hand, Schneider, Schwarz, Ouvert, Bockrunde).
 * Disabled-Logik basiert auf gameType und hand-Status.
 */
export default function ModifierChips({
  gameType, hand, setHand,
  schneider, setSchneider,
  schneiderAnnounced, setSchneiderAnnounced,
  schwarz, setSchwarz,
  schwarzAnnounced, setSchwarzAnnounced,
  ouvert, setOuvert,
  isBock, setIsBock,
}) {
  const isPassed = gameType === 'passed';
  const isNull   = gameType === 'null';

  const modifiers = [
    { key: 'hand',               label: 'Hand',               state: hand,               setter: setHand,               disabled: isPassed },
    { key: 'schneider',          label: 'Schneider',          state: schneider,          setter: setSchneider,          disabled: isPassed || isNull },
    { key: 'schneiderAnnounced', label: 'Schneider angesagt', state: schneiderAnnounced, setter: setSchneiderAnnounced, disabled: isPassed || isNull || !hand },
    { key: 'schwarz',            label: 'Schwarz',            state: schwarz,            setter: setSchwarz,            disabled: isPassed || isNull },
    { key: 'schwarzAnnounced',   label: 'Schwarz angesagt',   state: schwarzAnnounced,   setter: setSchwarzAnnounced,   disabled: isPassed || isNull || !hand },
    { key: 'ouvert',             label: 'Ouvert',             state: ouvert,             setter: setOuvert,             disabled: isPassed },
  ];

  return (
    <section className="form-section">
      <label className="section-label">Spielstufe</label>
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
        >
          Bockrunde
        </button>
      </div>
    </section>
  );
}
