import { AcademyProfile, BadgeDefinition } from './types';
import { ACADEMY_GAMES } from '../data/games';
import { BADGES } from '../data/badges';

export function badgeValue(profile: AcademyProfile, badge: BadgeDefinition): number {
  if (badge.id.startsWith('complete-')) {
    return ACADEMY_GAMES.filter(game => profile.games[game.id]?.completions > 0).length;
  }
  if (badge.id.startsWith('gold-')) {
    return ACADEMY_GAMES.filter(game => profile.games[game.id]?.bestMedal === 'gold').length;
  }
  if (badge.id.startsWith('streak-')) return profile.streak;
  if (badge.id.startsWith('glossary-')) return profile.readGlossaryIds.length;
  if (badge.id.startsWith('notes-')) return profile.notebook.length;
  if (badge.id.startsWith('skill-')) {
    const skill = badge.id.slice(6);
    const games = ACADEMY_GAMES.filter(game => game.skill === skill);
    if (!games.length) return 0;
    return games.filter(game => profile.games[game.id]?.completions > 0).length / games.length * 100;
  }
  return 0;
}

export function achievements(profile: AcademyProfile) {
  return BADGES.map(badge => {
    const value = badgeValue(profile, badge);
    return {
      ...badge,
      value: Math.min(badge.target, value),
      progress: Math.min(1, value / badge.target),
      earned: value >= badge.target,
    };
  });
}
