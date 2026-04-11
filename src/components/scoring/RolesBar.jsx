/**
 * RolesBar — zeigt die aktuellen Tischrollen (Geben/Hören/Sagen)
 * und bei 4 Spielern den aussetzendem Spieler.
 */
export default function RolesBar({ currentRoles, seatingCount }) {
  const roles = [
    { role: 'Geben', icon: 'style',              name: currentRoles.geber },
    { role: 'Hören', icon: 'hearing',             name: currentRoles.hoeren },
    { role: 'Sagen', icon: 'record_voice_over',   name: currentRoles.sagen },
  ];

  return (
    <div style={{
      display: 'flex', gap: '2rem', marginBottom: '2.5rem', padding: '1rem 1.5rem',
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

      {seatingCount === 4 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>pause_circle</span>
          <div>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--outline)', display: 'block' }}>Sitzt aus</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{currentRoles.geber}</span>
          </div>
        </div>
      )}
    </div>
  );
}
