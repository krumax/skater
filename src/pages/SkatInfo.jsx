import SuitIcon from '../components/SuitIcon';

// Plain icon colors - consistent with rest of app
const PLAIN_ICON_COLORS = {
  grand:   '#0b7a52',
  club:    '#1b1c1c',
  spade:   '#414944',
  heart:   '#b52619',
  diamond: '#b08a00',
  null:    '#4a7c6f',
};

// ── Reiztabelle-Daten ──
// Spalten: Gewinnstufen 1–5, Hand(6), Schneider(7), Schn.anges.(8), Schwarz(9), Schw.anges.(10), Ouvert(11)
const SUIT_ROWS = [
  { key: 'diamond', name: 'Karo',  suit: '♦', base: 9,  textColor: '#1b1c1c' },
  { key: 'heart',   name: 'Herz',  suit: '♥', base: 10, textColor: '#fff' },
  { key: 'spade',   name: 'Pik',   suit: '♠', base: 11, textColor: '#fff' },
  { key: 'club',    name: 'Kreuz', suit: '♣', base: 12, textColor: '#fff' },
];

const GRAND_BASE = 24;

// Spalten-Header
const COL_HEADERS = [
  { label: '1',  sub: null },
  { label: '2',  sub: null },
  { label: '3',  sub: null },
  { label: '4',  sub: null },
  { label: '5',  sub: null },
  { label: '6',  sub: 'Hand' },
  { label: '7',  sub: 'Schneider' },
  { label: '8',  sub: 'Schneider', subIcon: 'campaign' },
  { label: '9',  sub: 'Schwarz' },
  { label: '10', sub: 'Schwarz', subIcon: 'campaign' },
  { label: '11', sub: 'Ouvert' },
];

// Null-Spiele (feste Werte)
const NULL_ROWS = [
  { name: 'Null',            cols: [null, 23,   null, null, null, null, null, null, null, null, null] },
  { name: 'Null Hand',       cols: [null, null, 35,   null, null, null, null, null, null, null, null] },
  { name: 'Null Ouvert',     cols: [null, null, null, 46,   null, null, null, null, null, null, null] },
  { name: 'Null Ouvert Hand',cols: [null, null, null, null, 59,   null, null, null, null, null, null] },
];

function suitValue(base, multiplier) {
  return base * multiplier;
}

const cellBase = {
  padding: '0.4rem 0.5rem',
  textAlign: 'right',
  fontSize: '0.8125rem',
  fontWeight: 600,
  borderBottom: '1px solid rgba(192,200,195,0.25)',
};

const headerCellBase = {
  padding: '0.5rem 0.5rem',
  fontSize: '0.6rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'right',
  color: 'var(--on-surface-variant)',
  borderBottom: '2px solid rgba(192,200,195,0.4)',
  whiteSpace: 'nowrap',
};

export default function SkatInfo() {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Regelwerk</h1>
        <p className="page-subtitle">Nachschlagewerk - Reiztabelle und Spielwerte auf einen Blick.</p>
      </header>

      {/* ── So funktioniert Skatastrophe ── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Erste Schritte</span>
          <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>So funktioniert Skatastrophe</h3>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', padding: '1.5rem 1.75rem', border: '1px solid rgba(192,200,195,0.3)', lineHeight: 1.75, color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            Skatastrophe ersetzt den Zettel am Tisch. Ihr spielt Skat ganz normal offline – die App nimmt euch nur das lästige Rechnen und Aufschreiben ab.
          </p>

          {/* Schritt 1 */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>1</span>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>Tisch einrichten</p>
              <p style={{ margin: 0 }}>
                Unter <strong style={{ color: 'var(--on-surface)' }}>Einstellungen</strong> legst du den Tisch an: Namen der 3 oder 4 Spieler eingeben, den ersten <em>Geber</em> bestimmen und die Sitzreihenfolge festlegen. Die Reihenfolge entscheidet, wer nach wem gibt – und damit, wer in welcher Runde <em>Hören</em> und <em>Sagen</em> übernimmt.
              </p>
            </div>
          </div>

          {/* Schritt 2 */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--tertiary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--tertiary)' }}>2</span>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>Spielwerte nach jeder Runde eintragen</p>
              <p style={{ margin: 0 }}>
                Nach jedem gespielten Einzelspiel trägst du das Ergebnis ein in <strong style={{ color: 'var(--on-surface)' }}>Aktuelle Runde</strong> ein:
              </p>
              <ol style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Den <strong style={{ color: 'var(--on-surface)' }}>Alleinspieler</strong> auswählen (wer hat das Spiel angesagt?).</li>
                <li><strong style={{ color: 'var(--on-surface)' }}>Spielart</strong> wählen – Farbe (Kreuz/Pik/Herz/Karo), Grand oder Null.</li>
                <li><strong style={{ color: 'var(--on-surface)' }}>Modifikatoren</strong> setzen – Hand, Schneider, Schwarz, Ouvert falls gespielt.</li>
                <li><strong style={{ color: 'var(--on-surface)' }}>Spitzen</strong> eingeben (mit oder ohne, Anzahl) – der Reizwert wird automatisch berechnet.</li>
                <li><strong style={{ color: 'var(--on-surface)' }}>Augenzahl</strong> des Alleinspielers eintragen – daraus ergibt sich Gewinn oder Verlust.</li>
                <li>Auf <strong style={{ color: 'var(--on-surface)' }}>Runde speichern</strong> tippen – Punkte werden sofort verbucht, der Geber rückt automatisch weiter.</li>
              </ol>
              <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                Wurde <strong style={{ color: 'var(--on-surface)' }}>eingepasst</strong> (niemand hat gereizt)? Spielart <em>Eingepasst</em> wählen und speichern – keine Punkte, Geber wechselt trotzdem.
              </p>
            </div>
          </div>

          {/* Schritt 3 */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'color-mix(in srgb, #52B788 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#52B788' }}>3</span>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>Statistiken & Achievements</p>
              <p style={{ margin: 0 }}>
                Alle Spielwerte werden automatisch nach dem <strong style={{ color: 'var(--on-surface)' }}>Seeger-Fabian-System</strong> berechnet und in der Skat-Liste sowie den Statistiken angezeigt. Achievements schalten sich durch besondere Leistungen frei – wer zuerst alle sammelt, gewinnt den Stammtisch-Ruhm.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Was ist Skat? ── */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Hintergrund</span>
          <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Was ist Skat?</h3>
        </div>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', padding: '1.5rem 1.75rem', border: '1px solid rgba(192,200,195,0.3)', lineHeight: 1.75, color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
          <p style={{ marginBottom: '1rem' }}>
            Skat ist das bekannteste deutsche Kartenspiel und gilt als das <strong style={{ color: 'var(--on-surface)' }}>Nationalkartenspiel Deutschlands</strong>. Es entstand Anfang des 19. Jahrhunderts in <strong style={{ color: 'var(--on-surface)' }}>Altenburg (Thüringen)</strong> - einer Stadt, die bis heute als Wiege des Skats gilt. Der Name leitet sich vom lateinischen <em>scartare</em> (beiseitelegen) ab und bezeichnet die zwei Karten, die zu Beginn jeder Runde verdeckt auf den Tisch gelegt werden.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Gespielt wird zu <strong style={{ color: 'var(--on-surface)' }}>dritt</strong> - auch wenn vier Personen am Tisch sitzen, setzt immer einer aus. Ein Spieler (der <em>Alleinspieler</em>) tritt gegen die beiden anderen (<em>Gegenspieler</em>) an. Ziel des Alleinspielers ist es, mehr als 60 Augen zu sammeln und damit das angesagte Spiel zu gewinnen.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            Der Spielwert ergibt sich aus <strong style={{ color: 'var(--on-surface)' }}>Grundwert × Gewinnstufe</strong>. Die Gewinnstufe hängt von den Spitzen (lückenlose Trumpffolge vom Kreuz-Buben) und den gewählten Modifikatoren ab. Verliert der Alleinspieler, wird der Spielwert doppelt abgezogen.
          </p>
          <p>
            Seit 1927 gibt es den <strong style={{ color: 'var(--on-surface)' }}>Deutschen Skatverband</strong>, der die offiziellen Regeln festlegt. Skat wird heute weltweit gespielt - von gemütlichen Stammtischrunden bis zu internationalen Turnieren.
          </p>
        </div>
      </section>
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Offizielle Werte</span>
          <h3 className="headline" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reiztabelle</h3>
          <p style={{ color: 'var(--on-surface-variant)' }}>Spielwert = Grundwert × Gewinnstufe. Die Gewinnstufe ergibt sich aus Mit/Ohne Spitzen + Spielstufen-Modifikatoren.
            <span
              className="material-symbols-outlined"
              title="Gewinnstufe = Anzahl Spitzen (mit oder ohne) + 1 (Grundstufe) + je 1 für Hand, Schneider, Schneider angesagt, Schwarz, Schwarz angesagt, Ouvert. Spalten 1–5 = nur Spitzen, Spalten 6–11 = mit Modifikatoren."
              style={{ fontSize: '0.85rem', cursor: 'help', opacity: 0.6, verticalAlign: 'middle', marginLeft: '0.35rem', fontVariationSettings: "'FILL' 0" }}
            >info</span>
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.75rem', boxShadow: '0 8px 32px var(--shadow-color)', overflow: 'hidden', border: '1px solid rgba(192,200,195,0.3)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {/* Zeile 1: Spielart-Header (rowSpan 2) + Modifikator-Namen */}
                <tr style={{ backgroundColor: 'var(--surface-low)' }}>
                  <th rowSpan={2} style={{ ...headerCellBase, textAlign: 'left', minWidth: '130px', borderRight: '1px solid rgba(192,200,195,0.4)', paddingLeft: '1rem', verticalAlign: 'bottom' }}>
                    Spielart
                  </th>
                  {/* Leere Zellen für Gewinnstufen 1–5 */}
                  {[0,1,2,3,4].map(i => (
                    <th key={i} style={{ ...headerCellBase, minWidth: '52px', borderBottom: 'none', padding: '0.25rem 0.5rem' }} />
                  ))}
                  {/* Modifikator-Namen für Spalten 6–11 */}
                  {COL_HEADERS.slice(5).map((col, i) => (
                    <th key={i} style={{
                      ...headerCellBase,
                      minWidth: '52px',
                      borderBottom: 'none',
                      padding: '0.4rem 0.5rem 0.1rem',
                      backgroundColor: 'rgba(116, 91, 0, 0.06)',
                      color: 'var(--tertiary)',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.15rem', fontSize: '0.65rem', fontWeight: 800 }}>
                        {col.sub}
                        {col.subIcon && <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>{col.subIcon}</span>}
                      </span>
                    </th>
                  ))}
                </tr>
                {/* Zeile 2: Gewinnstufen 1–11 */}
                <tr style={{ backgroundColor: 'var(--surface-low)' }}>
                  {COL_HEADERS.map((col, i) => (
                    <th key={i} style={{
                      ...headerCellBase,
                      minWidth: '52px',
                      paddingTop: '0.1rem',
                      backgroundColor: i >= 5 ? 'rgba(116, 91, 0, 0.06)' : 'transparent',
                      color: i >= 5 ? 'var(--tertiary)' : 'var(--on-surface-variant)',
                    }}>
                      <span style={{ fontSize: '0.75rem' }}>{col.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Farbspiele + Grand */}
                {[...SUIT_ROWS, { key: 'grand', name: 'Grand', suit: null, base: GRAND_BASE, textColor: '#fff', matIcon: 'stars' }].map((row) => (
                  <tr key={row.key}
                    style={{ transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Spielart-Label */}
                    <td style={{ ...cellBase, textAlign: 'left', paddingLeft: '1rem', borderRight: '1px solid rgba(192,200,195,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {row.matIcon
                            ? <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: PLAIN_ICON_COLORS[row.key] }}>{row.matIcon}</span>
                            : <SuitIcon gameType={row.key} size="sm" color={PLAIN_ICON_COLORS[row.key]} />
                          }
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{row.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--outline)', fontWeight: 500 }}>×{row.base}</span>
                      </div>
                    </td>
                    {/* Werte für Gewinnstufen 1–11 */}
                    {COL_HEADERS.map((_, i) => {
                      const multiplier = i + 1;
                      const val = suitValue(row.base, multiplier);
                      const isSpecial = i >= 5;
                      return (
                        <td key={i} style={{
                          ...cellBase,
                          backgroundColor: isSpecial ? 'rgba(116, 91, 0, 0.04)' : 'transparent',
                          fontWeight: isSpecial ? 700 : 600,
                          color: isSpecial ? 'var(--tertiary)' : 'var(--on-surface)',
                        }}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Trennlinie vor Null */}
                <tr><td colSpan={12} style={{ height: '0', borderTop: '2px solid rgba(192,200,195,0.4)', padding: 0 }} /></tr>

                {/* Null-Spiele */}
                {NULL_ROWS.map((row) => (
                  <tr key={row.name}
                    style={{ transition: 'background 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-high)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ ...cellBase, textAlign: 'left', paddingLeft: '1rem', borderRight: '1px solid rgba(192,200,195,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '1.5rem', height: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: PLAIN_ICON_COLORS.null }}>block</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{row.name}</span>
                      </div>
                    </td>
                    {row.cols.map((val, i) => (
                      <td key={i} style={{
                        ...cellBase,
                        backgroundColor: i >= 5 ? 'rgba(116, 91, 0, 0.04)' : 'transparent',
                        color: val !== null ? 'var(--on-surface)' : 'transparent',
                        fontWeight: 700,
                      }}>
                        {val ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legende */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(116,91,0,0.15)', display: 'inline-block' }} />
            Spalten 6–11: Spielstufen-Modifikatoren (Hand, Schneider, Schwarz, Ouvert)
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
            Spielwert = Grundwert × Gewinnstufe (Mit/Ohne Spitzen + Modifikatoren)
          </span>
        </div>
      </section>
    </div>
  );
}
