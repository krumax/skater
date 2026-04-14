/**
 * RolesBar — zeigt die initiale Sitzordnung wie in den Einstellungen konfiguriert.
 */
import { Link } from 'react-router-dom';

const ROLE_LABELS = ['Geben', 'Hören', 'Sagen', 'Aussetzen'];
const HIGHLIGHT_COLOR = '#717974'; // Null-Grau

export default function RolesBar({ seating, step, totalDeals, completedRounds, bockRoundsLeft, onReset }) {
  const justCompleted = step === 0 && totalDeals > 0 && totalDeals % (seating.length || 3) === 0;

  const safeDeals  = isNaN(totalDeals)      ? '–' : totalDeals;
  const safeRounds = isNaN(completedRounds) ? '–' : completedRounds;

  return (
    <div style={{ marginBottom: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>
          Initiale Sitzordnung
        </span>
        <Link to="/players" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>settings</span>
          Sitzordnung ändern
        </Link>
      </div>

      <div style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: 'var(--surface-low)', borderRadius: '0.75rem',
        width: '100%', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        {/* Spieler-Chips — gleich breit, kompakt */}
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          {seating.map((name, i) => {
            const isActive   = i === step;
            const roleLabel  = ROLE_LABELS[i] ?? `Pos ${i + 1}`;
            return (
              <div key={i} style={{
                flex: '0 1 140px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                backgroundColor: isActive ? HIGHLIGHT_COLOR : 'transparent',
                border: `1px solid ${isActive ? HIGHLIGHT_COLOR : 'var(--outline-variant)'}`,
                transition: 'background-color 0.2s, border-color 0.2s',
                textAlign: 'center',
              }}>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', display: 'block',
                  color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--outline)',
                }}>
                  {roleLabel}
                </span>
                <span style={{
                  fontWeight: 700, fontSize: '0.875rem',
                  color: isActive ? '#fff' : 'var(--on-surface)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}>
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Counter + Reset — rechts auf gleicher Höhe */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', display: 'block' }}>
              Einzelspiele
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)' }}>
              {safeDeals}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)', display: 'block' }}>
              Runden
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: justCompleted ? 'var(--tertiary)' : 'var(--on-surface)' }}>
              {safeRounds}{justCompleted && <span style={{ fontSize: '0.75rem', marginLeft: '0.3rem' }}>✓</span>}
            </span>
          </div>
          <div style={{ textAlign: 'center', opacity: bockRoundsLeft > 0 ? 1 : 0.35 }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: bockRoundsLeft > 0 ? 'var(--secondary)' : 'var(--outline)', display: 'block' }}>
              Bockrunden
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: bockRoundsLeft > 0 ? 'var(--secondary)' : 'var(--on-surface)' }}>
              {bockRoundsLeft}
            </span>
          </div>
          <button
            onClick={onReset}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'none', border: '1px solid var(--outline-variant)',
              borderRadius: '0.4rem', padding: '0.3rem 0.7rem',
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--outline)',
              cursor: 'pointer', letterSpacing: '0.05em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>restart_alt</span>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
