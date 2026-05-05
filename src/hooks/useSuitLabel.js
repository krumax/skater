/**
 * useSuitLabel – returns a function that maps a gameType key to the
 * correct suit label for the currently active iconset.
 *
 * French:    club→Kreuz, spade→Pik, heart→Herz, diamond→Karo
 * Altenburg: club→Eichel, spade→Grün, heart→Rot, diamond→Schellen
 */
import { useIconset } from '../context/IconsetContext';
import { SUIT_LABELS } from '../lib/skatScoring';

const ALTENBURG_LABELS = {
  club:    'Eichel',
  spade:   'Grün',
  heart:   'Rot',
  diamond: 'Schellen',
};

export function useSuitLabel() {
  const { iconset } = useIconset();
  return (gameType) =>
    iconset === 'altenburg' && gameType in ALTENBURG_LABELS
      ? ALTENBURG_LABELS[gameType]
      : (SUIT_LABELS[gameType] ?? gameType);
}
