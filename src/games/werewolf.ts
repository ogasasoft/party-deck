import { Player } from "../core/types";
import { shuffle } from "../core/random";

export type RoleId = "villager" | "werewolf" | "seer" | "robber";

export type RoleDefinition = {
  roleId: RoleId;
  name: string;
  team: "human" | "werewolf" | "variable";
  nightOrder: number | null;
  description: string;
};

export type WerewolfConfig = {
  discussionTimeSec: 180 | 300;
  roleSet: "basic";
};

export type WerewolfPhase =
  | "setup"
  | "roleHandoff"
  | "roleReveal"
  | "nightSeerHandoff"
  | "nightSeer"
  | "nightWerewolfHandoff"
  | "nightWerewolf"
  | "nightRobberHandoff"
  | "nightRobber"
  | "nightRobberResult"
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
    roleSet: "basic"
  };
}

export function buildRoleSet(playerCount: number): RoleId[] {
  const cards: RoleId[] = ["werewolf", "werewolf", "seer", "robber"];
  while (cards.length < playerCount + 2) cards.push("villager");
  return cards.slice(0, playerCount + 2);
}

export function createWerewolfState(players: Player[], config: WerewolfConfig, seed: string): WerewolfState {
  const cards = shuffle(buildRoleSet(players.length), `${seed}:werewolf-cards`);
  const playerInitialCards: Record<string, RoleId> = {};
  players.forEach((player, index) => {
    playerInitialCards[player.id] = cards[index];
  });
  return {
    phase: "roleHandoff",
    config,
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
  replaceNightAction(state, { type: "werewolf", actorIds: playersWithRole(state, players, "werewolf").map((player) => player.id) });
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

export function nextWerewolfNightPhase(state: WerewolfState, players: Player[], after: "roles" | "seer" | "werewolf" | "robber"): WerewolfPhase {
  if (after === "roles" && playerWithRole(state, players, "seer")) return "nightSeerHandoff";
  if ((after === "roles" || after === "seer") && playersWithRole(state, players, "werewolf").length > 0) return "nightWerewolfHandoff";
  if ((after === "roles" || after === "seer" || after === "werewolf") && playerWithRole(state, players, "robber")) return "nightRobberHandoff";
  return "discussion";
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
  state.nightActions = [...state.nightActions.filter((item) => item.type !== action.type), action];
}
