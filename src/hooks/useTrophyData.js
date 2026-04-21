/**
 * useTrophyData.js - Leitet TrophyItem-Daten aus echten Spielrunden ab.
 *
 * Trophäen (Vitrine): Serien, Level, Sonder-Achievements
 * Matrix-Daten (kompakte Dot-Ansicht): Angriff + Abwehr
 */

import { useMemo } from 'react';
import { MATRIX_ROWS, NULL_ROWS, COL_SPECS } from '../lib/achievementConfig';
import { computePlayerLevel } from '../lib/playerLevel';
import { computePlayerStats } from '../lib/playerStats';

/**
 * @returns {{
 *   trophies: TrophyItem[],
 *   attackMatrix: MatrixRow[],
 *   defenseMatrix: MatrixRow[],
 *   levelLabel: string,
 *   levelEmoji: string,
 *   unlockedAttack: number,
 *   totalAttack: number,
 *   unlockedDefense: number,
 *   totalDefense: number,
 * }}
 */
export function useTrophyData(players, rounds, player) {
  return useMemo(() => {
    if (!player) return {
      trophies: [], attackMatrix: [], defenseMatrix: [],
      levelLabel: 'Anfänger', levelEmoji: '🃏',
      unlockedAttack: 0, totalAttack: 0,
      unlockedDefense: 0, totalDefense: 0,
    };

    const level = computePlayerLevel(rounds, player);
    const stats = computePlayerStats(rounds, player);

    // ── Angriff-Matrix ────────────────────────────────────────────────────────
    const attackMatrix = MATRIX_ROWS.map(row => {
      const wonGames = rounds.filter(r => r.player === player && r.won && r.gameType === row.type);
      return {
        key: row.type,
        name: row.name,
        suit: row.suit,
        color: row.color,
        textColor: row.textColor,
        cols: COL_SPECS.map(col => ({
          id: col.id,
          label: col.label + (col.label2 ? '+' + col.label2 : ''),
          isSpecial: col.isSpecial,
          unlocked: wonGames.some(col.check),
        })),
      };
    });

    // Null-Zeilen für Angriff
    const wonNull = rounds.filter(r => r.player === player && r.won && r.gameType === 'null');
    const nullAttackRow = {
      key: 'null',
      name: 'Null',
      suit: '∅',
      color: '#2c4a6e',
      textColor: '#fff',
      isNullRow: true,
      cols: NULL_ROWS.map(nr => ({
        id: nr.id,
        label: nr.name,
        isSpecial: nr.id !== 'null',
        unlocked: wonNull.some(nr.check),
      })),
    };
    attackMatrix.push(nullAttackRow);

    // ── Abwehr-Matrix ─────────────────────────────────────────────────────────
    const defenseWins = rounds.filter(r => r.player !== player && !r.won && r.gameType !== 'passed');
    const defenseMatrix = MATRIX_ROWS.map(row => {
      const relevant = defenseWins.filter(r => r.gameType === row.type);
      return {
        key: row.type,
        name: row.name,
        suit: row.suit,
        color: row.color,
        textColor: row.textColor,
        cols: COL_SPECS.map(col => ({
          id: col.id,
          label: col.label + (col.label2 ? '+' + col.label2 : ''),
          isSpecial: col.isSpecial,
          unlocked: relevant.some(col.check),
        })),
      };
    });
    const nullDefense = defenseWins.filter(r => r.gameType === 'null');
    defenseMatrix.push({
      key: 'null',
      name: 'Null',
      suit: '∅',
      color: '#2c4a6e',
      textColor: '#fff',
      isNullRow: true,
      cols: NULL_ROWS.map(nr => ({
        id: nr.id,
        label: nr.name,
        isSpecial: nr.id !== 'null',
        unlocked: nullDefense.some(nr.check),
      })),
    });

    // Zähler
    const unlockedAttack  = attackMatrix.reduce((s, r) => s + r.cols.filter(c => c.unlocked).length, 0);
    const totalAttack     = attackMatrix.reduce((s, r) => s + r.cols.length, 0);
    const unlockedDefense = defenseMatrix.reduce((s, r) => s + r.cols.filter(c => c.unlocked).length, 0);
    const totalDefense    = defenseMatrix.reduce((s, r) => s + r.cols.length, 0);

    // ── Echte Trophäen (Vitrine) ──────────────────────────────────────────────
    const trophies = [];

    // Serien
    [
      { min: 3,  id: 'streak_3',  title: 'Drei in Folge',  rarity: 'common',    icon: '🔥', desc: '3 Spiele in Serie gewonnen' },
      { min: 5,  id: 'streak_5',  title: 'Fünf in Folge',  rarity: 'rare',      icon: '🔥', desc: '5 Spiele in Serie gewonnen' },
      { min: 8,  id: 'streak_8',  title: 'Acht in Folge',  rarity: 'epic',      icon: '⚡', desc: '8 Spiele in Serie gewonnen' },
      { min: 12, id: 'streak_12', title: 'Zwölf in Folge', rarity: 'legendary', icon: '👑', desc: '12 Spiele in Serie gewonnen' },
    ].forEach(t => trophies.push({
      id: t.id, title: t.title, description: t.desc,
      type: 'trophy', rarity: t.rarity, icon: t.icon, category: 'Serie',
      unlocked: stats.longestWinStreak >= t.min,
    }));

    // Level
    [
      { min: 10,  id: 'lvl_geselle',    title: 'Geselle',      rarity: 'common',    icon: '🎯', desc: 'Level Geselle erreicht' },
      { min: 35,  id: 'lvl_experte',    title: 'Experte',      rarity: 'rare',      icon: '🏅', desc: 'Level Experte erreicht' },
      { min: 50,  id: 'lvl_meister',    title: 'Meister',      rarity: 'epic',      icon: '🏆', desc: 'Level Meister erreicht' },
      { min: 90,  id: 'lvl_legende',    title: 'Skatlegende',  rarity: 'legendary', icon: '⭐', desc: 'Level Skatlegende erreicht' },
      { min: 110, id: 'lvl_unsterblich',title: 'Unsterblicher',rarity: 'legendary', icon: '🌟', desc: 'Höchstes Level erreicht' },
    ].forEach(t => trophies.push({
      id: t.id, title: t.title, description: t.desc,
      type: 'star', rarity: t.rarity, icon: t.icon, category: 'Level',
      unlocked: level.min >= t.min,
    }));

    // Sonder
    trophies.push({
      id: 'baguette_survivor', title: 'Baguette-Überlebender',
      description: '1 Baguette überlebt (6 Runden ohne Spiel)',
      type: 'badge', rarity: 'common', icon: '🥖', category: 'Ausdauer',
      unlocked: stats.baguettes >= 1,
    });
    trophies.push({
      id: 'baguette_pro', title: 'Baguette-Profi',
      description: '5 Baguettes überlebt',
      type: 'medal', rarity: 'rare', icon: '🥖', category: 'Ausdauer',
      unlocked: stats.baguettes >= 5,
    });
    trophies.push({
      id: 'centurion', title: 'Centurion',
      description: '100 Spiele als Alleinspieler',
      type: 'trophy', rarity: 'epic', icon: '💯', category: 'Ausdauer',
      unlocked: stats.totalGames >= 100,
    });
    trophies.push({
      id: 'sharpshooter', title: 'Scharfschütze',
      description: 'Siegquote über 60%',
      type: 'medal', rarity: 'rare', icon: '🎯', category: 'Können',
      unlocked: stats.totalGames >= 10 && parseFloat(stats.winRate) >= 60,
    });
    trophies.push({
      id: 'dominator', title: 'Dominator',
      description: 'Siegquote über 75%',
      type: 'trophy', rarity: 'legendary', icon: '⚡', category: 'Können',
      unlocked: stats.totalGames >= 20 && parseFloat(stats.winRate) >= 75,
    });

    return {
      trophies,
      attackMatrix,
      defenseMatrix,
      levelLabel: level.label,
      levelEmoji: level.emoji,
      unlockedAttack,
      totalAttack,
      unlockedDefense,
      totalDefense,
    };
  }, [players, rounds, player]); // eslint-disable-line react-hooks/exhaustive-deps
}
