import reactionsJson from './reactions.json';
import type { ReactionData } from './types';

export const REACTIONS = reactionsJson as ReactionData[];

export const REACTION_BY_ID: Record<string, ReactionData> = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.id, reaction]),
);

export function getReaction(id: string): ReactionData {
  return REACTION_BY_ID[id] ?? REACTIONS[0];
}
