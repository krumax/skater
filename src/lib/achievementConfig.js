/**
 * achievementConfig.js - Single Source of Truth für die Achievement-Matrix.
 *
 * Wird verwendet von:
 *   - src/hooks/useMatrixData.js
 *   - src/hooks/useDefenseData.js
 *   - src/lib/playerLevel.js
 *   - src/components/AchievementWatcher.jsx
 */

/** Farb- und Anzeige-Konfiguration je Spieltyp (Zeilen der Matrix) */
export const MATRIX_ROWS = [
  { type: 'grand',   name: 'Grand', suit: null, matIcon: 'stars', color: '#0b3d2e', textColor: '#fff',     subtitle: 'Grundwert 24' },
  { type: 'club',    name: 'Kreuz', suit: '♣',  matIcon: null,    color: '#1b1c1c', textColor: '#fff',     subtitle: 'Grundwert 12' },
  { type: 'spade',   name: 'Pik',   suit: '♠',  matIcon: null,    color: '#414944', textColor: '#fff',     subtitle: 'Grundwert 11' },
  { type: 'heart',   name: 'Herz',  suit: '♥',  matIcon: null,    color: '#b52619', textColor: '#fff',     subtitle: 'Grundwert 10' },
  { type: 'diamond', name: 'Karo',  suit: '♦',  matIcon: null,    color: '#d0a600', textColor: '#1b1c1c',  subtitle: 'Grundwert 9'  },
];

/** Null-Varianten als eigene Zeilen (Sonderbehandlung in der Matrix) */
export const NULL_ROWS = [
  { id: 'null',             name: 'Null',            check: (r) => !r.hand && !r.ouvert, specialColIdx: 0 },
  { id: 'null_hand',        name: 'Null Hand',        check: (r) =>  r.hand && !r.ouvert, specialColIdx: 1 },
  { id: 'null_ouvert',      name: 'Null Ouvert',      check: (r) => !r.hand &&  r.ouvert, specialColIdx: 2 },
  { id: 'null_hand_ouvert', name: 'Null Hand Ouvert', check: (r) =>  r.hand &&  r.ouvert, specialColIdx: 3 },
];

/** Spalten-Spezifikationen (Gewinnstufen + Sonderzustände) */
export const COL_SPECS = [
  { id: 'mit_1',              label: '+1',        isSpecial: false, check: (r) => r.mitOhne === 'mit'  && r.spitzen === 1 },
  { id: 'mit_2',              label: '+2',        isSpecial: false, check: (r) => r.mitOhne === 'mit'  && r.spitzen === 2 },
  { id: 'mit_3',              label: '+3',        isSpecial: false, check: (r) => r.mitOhne === 'mit'  && r.spitzen === 3 },
  { id: 'mit_4',              label: '+4',        isSpecial: false, check: (r) => r.mitOhne === 'mit'  && r.spitzen === 4 },
  { id: 'ohne_1',             label: '−1',        isSpecial: false, check: (r) => r.mitOhne === 'ohne' && r.spitzen === 1 },
  { id: 'ohne_2',             label: '−2',        isSpecial: false, check: (r) => r.mitOhne === 'ohne' && r.spitzen === 2 },
  { id: 'ohne_3',             label: '−3',        isSpecial: false, check: (r) => r.mitOhne === 'ohne' && r.spitzen === 3 },
  { id: 'ohne_4',             label: '−4',        isSpecial: false, check: (r) => r.mitOhne === 'ohne' && r.spitzen === 4 },
  { id: 'hand',               label: 'Hand',      isSpecial: true,  check: (r) =>  r.hand && !r.schneider && !r.schwarz },
  { id: 'hand_schneider',     label: 'Hand',      isSpecial: true,  icon: 'add', label2: 'S',  check: (r) =>  r.hand &&  r.schneider && !r.schwarz },
  { id: 'hand_schwarz',       label: 'Hand',      isSpecial: true,  icon: 'add', label2: 'Sz', check: (r) =>  r.hand &&  r.schwarz },
  { id: 'schneider',          label: 'Schneider', isSpecial: true,  check: (r) => !r.hand && (r.schneider || r.schneiderAnsagt) },
  { id: 'schneiderAnnounced', label: 'Schneider', isSpecial: true,  icon: 'campaign', check: (r) => r.schneiderAnnounced },
  { id: 'schwarz',            label: 'Schwarz',   isSpecial: true,  check: (r) => !r.hand && (r.schwarz  || r.schwarzAnsagt) },
  { id: 'schwarzAnnounced',   label: 'Schwarz',   isSpecial: true,  icon: 'campaign', check: (r) => r.schwarzAnnounced },
  { id: 'ouvert',             label: 'Ouvert',    isSpecial: true,  check: (r) =>  r.ouvert },
];

/** Hilfsfunktion: Formatiert ein ISO-Timestamp als deutsches Datum */
export function formatDate(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
