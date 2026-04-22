import { useState } from 'react';

const SpiellistenSelector = ({ spiellisten, activeId, onSelect, onCreateNew }) => {
  const [open, setOpen] = useState(false);
  const activeListe = spiellisten.find(l => l.id === activeId) ?? null;

  const handleSelect = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', marginBottom: '1rem' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          width: '100%', padding: '0.625rem 1rem',
          backgroundColor: 'var(--surface-low)',
          border: '1px solid var(--outline-variant)',
          borderRadius: '0.5rem', cursor: 'pointer',
          color: 'var(--on-surface)', fontFamily: 'inherit',
          fontSize: '0.875rem', textAlign: 'left',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--primary)', flexShrink: 0 }}>
          playlist_play
        </span>
        <span style={{ flex: 1, fontWeight: 600 }}>
          {activeListe ? activeListe.name : 'Ohne Liste'}
        </span>
        <span
          className="material-symbols-outlined"
          title="Spielserie: Gruppiert eine festgelegte Anzahl Runden zu einer Serie. Nützlich für Turniere oder Abende mit mehreren Durchgängen."
          style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.5, fontVariationSettings: "'FILL' 0" }}
          onClick={e => e.stopPropagation()}
        >info</span>
        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--outline)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          backgroundColor: 'var(--surface)', border: '1px solid var(--outline-variant)',
          borderRadius: '0.5rem', boxShadow: '0 8px 24px var(--shadow-color)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {/* Active lists */}
          {spiellisten.map(liste => (
            <button
              key={liste.id}
              onClick={() => handleSelect(liste.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                width: '100%', padding: '0.625rem 1rem',
                backgroundColor: liste.id === activeId ? 'var(--primary-container)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: liste.id === activeId ? 'var(--on-primary-container)' : 'var(--on-surface)',
                fontFamily: 'inherit', fontSize: '0.875rem', textAlign: 'left',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', opacity: 0.7 }}>
                {liste.id === activeId ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              <span style={{ flex: 1 }}>{liste.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--outline)' }}>
                {liste.roundCount} Runden
              </span>
            </button>
          ))}

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', margin: '0.25rem 0' }} />

          {/* Without list option */}
          <button
            onClick={() => handleSelect(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.625rem 1rem',
              backgroundColor: activeId === null ? 'var(--primary-container)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: activeId === null ? 'var(--on-primary-container)' : 'var(--on-surface)',
              fontFamily: 'inherit', fontSize: '0.875rem', textAlign: 'left',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', opacity: 0.7 }}>
              {activeId === null ? 'radio_button_checked' : 'radio_button_unchecked'}
            </span>
            <span>Ohne Liste weiterspielen</span>
          </button>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'var(--outline-variant)', margin: '0.25rem 0' }} />

          {/* New list button */}
          <button
            onClick={() => { setOpen(false); onCreateNew(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              width: '100%', padding: '0.625rem 1rem',
              backgroundColor: 'transparent',
              border: 'none', cursor: 'pointer',
              color: 'var(--primary)',
              fontFamily: 'inherit', fontSize: '0.875rem', textAlign: 'left',
              fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_circle</span>
            <span>Neue Serie erstellen</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SpiellistenSelector;
