/**
 * trophyData.js - Datenmodell und Beispieldaten für die Pokalvitrine.
 */

/**
 * @typedef {'common' | 'rare' | 'epic' | 'legendary'} Rarity
 * @typedef {'trophy' | 'medal' | 'badge' | 'star'} TrophyType
 *
 * @typedef {Object} TrophyItem
 * @property {string}    id
 * @property {string}    title
 * @property {string}    description
 * @property {TrophyType} type
 * @property {Rarity}    rarity
 * @property {boolean}   unlocked
 * @property {string}    [season]
 * @property {number}    [rank]
 * @property {string}    [category]
 * @property {string}    [icon]
 */

export const RARITY_CONFIG = {
  // Warme, satte Farben - gut lesbar auf hellem Hintergrund
  common:    { label: 'Gewöhnlich', color: '#6b7a8d', glow: 'rgba(107,122,141,0.3)', bg: '#f0ece4', border: '#c8c0b0', textColor: '#3a3530' },
  rare:      { label: 'Selten',     color: '#1a6abf', glow: 'rgba(26,106,191,0.35)', bg: '#e8f0fa', border: '#90b8e8', textColor: '#0d3a70' },
  epic:      { label: 'Episch',     color: '#7c3aed', glow: 'rgba(124,58,237,0.4)',  bg: '#f0eafc', border: '#c4a0f0', textColor: '#4a1a90' },
  legendary: { label: 'Legendär',   color: '#c8780a', glow: 'rgba(200,120,10,0.5)',  bg: '#fef3dc', border: '#f0c060', textColor: '#7a4400' },
};

export const EXAMPLE_TROPHIES = [
  {
    id: 'grand_meister',
    title: 'Grand-Meister',
    description: 'Grand Hand Schwarz gewonnen',
    type: 'trophy',
    rarity: 'legendary',
    unlocked: true,
    season: '2024',
    rank: 1,
    category: 'Angriff',
    icon: '👑',
  },
  {
    id: 'null_ouvert',
    title: 'Null Ouvert',
    description: 'Null Hand Ouvert erfolgreich gespielt',
    type: 'star',
    rarity: 'epic',
    unlocked: true,
    season: '2024',
    category: 'Angriff',
    icon: '⭐',
  },
  {
    id: 'siegesserie_5',
    title: 'Fünf in Folge',
    description: '5 Spiele in Serie gewonnen',
    type: 'medal',
    rarity: 'rare',
    unlocked: true,
    season: '2024',
    category: 'Serie',
    icon: '🏅',
  },
  {
    id: 'abwehr_grand',
    title: 'Grand-Stopper',
    description: 'Grand Hand als Gegenspieler gestoppt',
    type: 'badge',
    rarity: 'epic',
    unlocked: true,
    season: '2023',
    category: 'Abwehr',
    icon: '🛡️',
  },
  {
    id: 'skatlegende',
    title: 'Skatlegende',
    description: 'Level "Skatlegende" erreicht',
    type: 'trophy',
    rarity: 'legendary',
    unlocked: false,
    category: 'Level',
    icon: '🏆',
  },
  {
    id: 'kreuz_hand',
    title: 'Kreuz Hand',
    description: 'Kreuz Hand gewonnen',
    type: 'badge',
    rarity: 'common',
    unlocked: true,
    season: '2023',
    category: 'Angriff',
    icon: '♣',
  },
];
