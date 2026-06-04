import { Player } from "../core/types";
import { shuffle } from "../core/random";

export type RoleId = "villager" | "werewolf" | "seer" | "robber";
export const WEREWOLF_ROLE_IDS: RoleId[] = ["werewolf", "seer", "robber", "villager"];

export type RoleCounts = Record<RoleId, number>;

export type RoleDefinition = {
  roleId: RoleId;
  name: string;
  team: "human" | "werewolf" | "variable";
  nightOrder: number | null;
  description: string;
  actionSummary: string;
  detail: string;
  nightAction: string;
  discussionHint: string;
  winConditionHint: string;
};

export type WerewolfConfig = {
  discussionTimeSec: 180 | 300;
  roleCounts: RoleCounts;
};

export type WerewolfPhase =
  | "setup"
  | "roleHandoff"
  | "roleReveal"
  | "nightHandoff"
  | "nightAction"
  | "discussion"
  | "voteHandoff"
  | "vote"
  | "result";

export type WerewolfVote =
  | { fromPlayerId: string; targetType: "player"; targetPlayerId: string }
  | { fromPlayerId: string; targetType: "peace" };

export type WerewolfNightAction =
  | { type: "seer"; mode: "player"; actorId?: string; targetPlayerId?: string; seenRole?: RoleId }
  | { type: "seer"; mode: "center"; actorId?: string; seenCenterCards?: [RoleId, RoleId] }
  | { type: "robber"; actorId?: string; targetPlayerId?: string; skipped?: boolean; newRole?: RoleId }
  | { type: "werewolf"; actorIds: string[] };

export type WerewolfState = {
  phase: WerewolfPhase;
  config: WerewolfConfig;
  currentPlayerIndex: number;
  playerInitialCards: Record<string, RoleId>;
  playerCurrentCards: Record<string, RoleId>;
  centerCards: [RoleId, RoleId];
  roleRevealDonePlayerIds: string[];
  nightActions: WerewolfNightAction[];
  votes: WerewolfVote[];
};

export type WerewolfResult = {
  executedPlayerIds: string[];
  winningTeam: "human" | "werewolf" | "everyone";
  reason: string;
};

export function defaultWerewolfConfig(): WerewolfConfig {
  return {
    discussionTimeSec: 180,
    roleCounts: defaultRoleCounts(4)
  };
}

export function defaultRoleCounts(playerCount: number): RoleCounts {
  const target = playerCount + 2;
  return {
    werewolf: Math.min(2, target),
    seer: target >= 3 ? 1 : 0,
    robber: target >= 4 ? 1 : 0,
    villager: Math.max(0, target - 4)
  };
}

export function normalizeWerewolfConfig(config: Partial<WerewolfConfig> | null | undefined, playerCount = 4): WerewolfConfig {
  const fallback = defaultWerewolfConfig();
  return {
    discussionTimeSec: config?.discussionTimeSec === 300 ? 300 : fallback.discussionTimeSec,
    roleCounts: normalizeRoleCounts(config?.roleCounts, playerCount + 2)
  };
}

export function normalizeRoleCounts(counts: Partial<RoleCounts> | null | undefined, targetCards: number): RoleCounts {
  const next: RoleCounts = {
    werewolf: sanitizeRoleCount(counts?.werewolf),
    seer: sanitizeRoleCount(counts?.seer),
    robber: sanitizeRoleCount(counts?.robber),
    villager: sanitizeRoleCount(counts?.villager)
  };
  const total = countRoleCards(next);
  if (total < targetCards) {
    next.villager += targetCards - total;
  }
  return next;
}

export function countRoleCards(counts: RoleCounts) {
  return WEREWOLF_ROLE_IDS.reduce((sum, roleId) => sum + counts[roleId], 0);
}

export function buildRoleSet(playerCount: number, roleCounts?: Partial<RoleCounts>): RoleId[] {
  const targetCards = playerCount + 2;
  const counts = normalizeRoleCounts(roleCounts ?? defaultRoleCounts(playerCount), targetCards);
  return WEREWOLF_ROLE_IDS.flatMap((roleId) => Array.from({ length: counts[roleId] }, () => roleId)).slice(0, targetCards);
}

export function createWerewolfState(players: Player[], config: WerewolfConfig, seed: string): WerewolfState {
  const normalizedConfig = normalizeWerewolfConfig(config, players.length);
  const cards = shuffle(buildRoleSet(players.length, normalizedConfig.roleCounts), `${seed}:werewolf-cards`);
  const playerInitialCards: Record<string, RoleId> = {};
  players.forEach((player, index) => {
    playerInitialCards[player.id] = cards[index];
  });
  return {
    phase: "roleHandoff",
    config: normalizedConfig,
    currentPlayerIndex: 0,
    playerInitialCards,
    playerCurrentCards: { ...playerInitialCards },
    centerCards: [cards[players.length], cards[players.length + 1]],
    roleRevealDonePlayerIds: [],
    nightActions: [],
    votes: []
  };
}

export function applyRobberAction(state: WerewolfState, actorId: string, targetPlayerId?: string) {
  if (!targetPlayerId) {
    replaceNightAction(state, { type: "robber", actorId, skipped: true, newRole: state.playerCurrentCards[actorId] });
    return state;
  }
  const actorRole = state.playerCurrentCards[actorId];
  const newRole = state.playerCurrentCards[targetPlayerId];
  state.playerCurrentCards[actorId] = state.playerCurrentCards[targetPlayerId];
  state.playerCurrentCards[targetPlayerId] = actorRole;
  replaceNightAction(state, { type: "robber", actorId, targetPlayerId, newRole });
  return state;
}

export function applySeerAction(state: WerewolfState, actorId: string, selection: { mode: "center" } | { mode: "player"; targetPlayerId: string }) {
  if (selection.mode === "center") {
    replaceNightAction(state, { type: "seer", mode: "center", actorId, seenCenterCards: [...state.centerCards] as [RoleId, RoleId] });
    return state;
  }
  replaceNightAction(state, {
    type: "seer",
    mode: "player",
    actorId,
    targetPlayerId: selection.targetPlayerId,
    seenRole: state.playerCurrentCards[selection.targetPlayerId]
  });
  return state;
}

export function recordWerewolfAction(state: WerewolfState, players: Player[]) {
  replaceNightAction(state, { type: "werewolf", actorIds: players.filter((player) => state.playerInitialCards[player.id] === "werewolf").map((player) => player.id) });
  return state;
}

export function playerWithRole(state: WerewolfState, players: Player[], roleId: RoleId) {
  return players.find((player) => state.playerCurrentCards[player.id] === roleId);
}

export function playersWithRole(state: WerewolfState, players: Player[], roleId: RoleId) {
  return players.filter((player) => state.playerCurrentCards[player.id] === roleId);
}

export function getNightAction<TType extends WerewolfNightAction["type"]>(state: WerewolfState, type: TType) {
  return state.nightActions.find((action): action is Extract<WerewolfNightAction, { type: TType }> => action.type === type);
}

export function nextWerewolfNightPhase(_state: WerewolfState, _players: Player[], _after: "roles" | "seer" | "werewolf" | "robber"): WerewolfPhase {
  return "nightHandoff";
}

export function judgeWerewolf(state: WerewolfState, players: Player[]): WerewolfResult {
  const playerWerewolves = players.filter((player) => state.playerCurrentCards[player.id] === "werewolf");
  const playerVotes = state.votes.filter((vote) => vote.targetType === "player") as Extract<WerewolfVote, { targetType: "player" }>[];
  const peaceVotes = state.votes.filter((vote) => vote.targetType === "peace").length;
  const voteCounts = new Map<string, number>();
  playerVotes.forEach((vote) => {
    voteCounts.set(vote.targetPlayerId, (voteCounts.get(vote.targetPlayerId) ?? 0) + 1);
  });

  const maxVotes = Math.max(0, ...voteCounts.values());
  const allVotesScattered = maxVotes <= 1 && peaceVotes === 0 && state.votes.length === players.length;
  const peaceMajority = peaceVotes > players.length / 2;
  const executedPlayerIds =
    allVotesScattered || peaceMajority
      ? []
      : [...voteCounts.entries()].filter(([, count]) => count === maxVotes && maxVotes > 0).map(([playerId]) => playerId);

  if (executedPlayerIds.length === 0) {
    if (playerWerewolves.length === 0) {
      return { executedPlayerIds, winningTeam: "everyone", reason: "場に人狼がいないため、全員の勝利です。" };
    }
    return { executedPlayerIds, winningTeam: "werewolf", reason: "処刑なしで人狼が残ったため、人狼チームの勝利です。" };
  }

  const executedWerewolf = executedPlayerIds.some((playerId) => state.playerCurrentCards[playerId] === "werewolf");
  if (executedWerewolf) {
    return { executedPlayerIds, winningTeam: "human", reason: "処刑対象に人狼が含まれたため、人間チームの勝利です。" };
  }
  return { executedPlayerIds, winningTeam: "werewolf", reason: "人間だけが処刑されたため、人狼チームの勝利です。" };
}

function replaceNightAction(state: WerewolfState, action: WerewolfNightAction) {
  state.nightActions = [
    ...state.nightActions.filter((item) => {
      if (item.type !== action.type) return true;
      if ("actorId" in action && action.actorId) {
        return !("actorId" in item && item.actorId === action.actorId);
      }
      return false;
    }),
    action
  ];
}

function sanitizeRoleCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
