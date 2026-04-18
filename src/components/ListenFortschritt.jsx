import { computeListProgress } from '../lib/spiellistenUtils';

const ListenFortschritt = ({ spielliste, listRounds, onClose }) => {
  const progress = computeListProgress(spielliste, listRounds);
  if (!progress) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.625rem 1rem', borderRadius: '0.5rem',
      backgroundColor: 'var(--surface-low)',
      border: '1px solid var(--outline-variant)',
      marginBottom: '1rem',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: 'var(--primary)', flexShrink: 0 }}>
        format_list_numbered
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--outline)', marginBottom: '0.15rem' }}>
          {spielliste.name}
        </p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--on-surface)', fontFamily: "'Manrope', sans-serif" }}>
          Runde {progress.current} von {progress.total}
        </p>
      </div>
      {/* Progress bar */}
      <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--outline-variant)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
          height: '100%',
          width: `${Math.min((progress.current / progress.total) * 100, 100)}%`,
          backgroundColor: 'var(--primary)',
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {onClose && (
        <button
          onClick={() => onClose(spielliste.id)}
          title="Liste beenden"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            color: 'var(--outline)', fontSize: '0.75rem', fontFamily: 'inherit',
            padding: '0.25rem 0.5rem', borderRadius: '0.375rem',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--outline)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>stop_circle</span>
          Beenden
        </button>
      )}
    </div>
  );
};

export default ListenFortschritt;
