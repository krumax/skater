/**
 * RolesBar — zeigt die initiale Sitzordnung wie in den Einstellungen konfiguriert.
 * Geben = seating[0], Hören = seating[1], Sagen = seating[2].
 * Ändert sich nicht mit den Runden.
 */
import { Link } from 'react-router-dom';

export default function RolesBar({ seating }) {
  const roles = [
    { role: 'Geben', icon: 'style',            name: seating[0] ?? '–' },
    { role: 'Hören', icon: 'hearing',           name: seating[1] ?? '–' },
    { role: 'Sagen', icon: 'record_voice_over', name: seating[2] ?? '–' },
  ];

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)' }}>
          Initiale Sitzordnung
        </span>
        <Link to="/players" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>settings</span>
          Sitzordnung ändern
        </Link>
      </div>

      <div style={{
        display: 'flex', gap: '2rem', padding: '1rem 1.5rem',
        backgroundColor: 'var(--surface-low)', borderRadius: '0.75rem',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        {roles.map(r => (
          <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{r.icon}</span>
            <div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', display: 'block' }}>{r.role}</span>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{r.name}</span>
            </div>
          </div>
        ))}

        {seating.length === 4 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>pause_circle</span>
            <div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', display: 'block' }}>4. Spieler</span>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>{seating[3]}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
