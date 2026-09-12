import { useIconset } from '../../context/IconsetContext';
import { useSuitLabel } from '../../hooks/useSuitLabel';
import { DECK_RANK_LABELS } from '../../lib/reizwertTrainer.js';
import { SUIT_ICON_COLORS } from '../../lib/tokens.js';
import SuitIcon from '../SuitIcon';

const DEFAULT_SIZE = 'md';
const SUPPORTED_SIZES = new Set(['sm', 'md', 'lg']);
const ICON_SIZE_BY_CARD_SIZE = Object.freeze({
  sm: 'xl',
  md: 'lg',
  lg: 'xl',
});

const ALTENBURG_RANK_LABELS = Object.freeze({
  ...DECK_RANK_LABELS,
  jack: 'Unter',
  queen: 'Ober',
});

/**
 * Displays one card from the trainer's German 32-card deck.
 *
 * The preferred API is `card={card}` with an object returned by createDeck().
 * Rank and suit props are also accepted as small convenience overrides for
 * callers that already have the card fields separated.
 *
 * @param {object} props
 * @param {{id?: string, rank?: string, rankLabel?: string, suit?: string, suitLabel?: string}} props.card
 * @param {string} [props.rank]
 * @param {string} [props.rankLabel]
 * @param {string} [props.suit]
 * @param {string} [props.suitLabel]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 * @param {object} [props.style]
 */
export default function PlayingCard({
  card,
  rank,
  rankLabel,
  suit,
  suitLabel,
  size = DEFAULT_SIZE,
  className,
  style,
}) {
  const { iconset } = useIconset();
  const getSuitLabel = useSuitLabel();
  const cardData = card ?? {};
  const resolvedRank = rank ?? cardData.rank;
  const resolvedSuit = suit ?? cardData.suit;
  const rankLabels = iconset === 'altenburg' ? ALTENBURG_RANK_LABELS : DECK_RANK_LABELS;
  const iconsetSuitLabel = resolvedSuit ? getSuitLabel(resolvedSuit) : undefined;
  const visibleRank = rankLabel
    ?? rankLabels[resolvedRank]
    ?? cardData.rankLabel
    ?? resolvedRank
    ?? 'Karte';
  const visibleSuit = suitLabel
    ?? iconsetSuitLabel
    ?? cardData.suitLabel
    ?? resolvedSuit
    ?? 'Unbekannte Farbe';
  const resolvedSize = SUPPORTED_SIZES.has(size) ? size : DEFAULT_SIZE;
  const accessibleName = `${visibleSuit}-${visibleRank}`;
  const classes = ['playing-card', `playing-card--${resolvedSize}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="img"
      aria-label={accessibleName}
      data-card-id={cardData.id}
      data-size={resolvedSize}
      style={style}
    >
      <span className="playing-card__rank" aria-hidden="true">
        {visibleRank}
      </span>

      <span className="playing-card__suit-icon" aria-hidden="true">
        <SuitIcon
          gameType={resolvedSuit}
          size={ICON_SIZE_BY_CARD_SIZE[resolvedSize]}
          color={SUIT_ICON_COLORS[resolvedSuit]}
        />
      </span>

      <span className="playing-card__suit-label" aria-hidden="true">
        {visibleSuit}
      </span>
    </div>
  );
}
