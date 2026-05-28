import { sample, shuffle } from "../core/random";
import { Player } from "../core/types";
import { RankingAnswerCategory, RankingAnswerPrompt, rankingAnswerPrompts } from "../data/rankingAnswerPrompts";

export type RankingAnswersConfig = {
  promptCategory: "all" | RankingAnswerCategory;
  roundCount: 5;
  mistakeLimit: 5;
};

export type RankingAnswersPhase = "numberHandoff" | "numberReveal" | "answer" | "order" | "roundResult" | "final";

export type RankingAssignment = {
  playerId: string;
  number: number;
  answerText?: string;
};

export type RankingAnswersRound = {
  roundIndex: number;
  captainPlayerId: string;
  prompt: RankingAnswerPrompt;
  assignments: RankingAssignment[];
  captainOrder: string[];
  mistakeCount?: number;
};

export type RankingAnswersState = {
  phase: RankingAnswersPhase;
  config: RankingAnswersConfig;
  currentRoundIndex: number;
  currentPlayerIndex: number;
  numberRevealDonePlayerIds: string[];
  rounds: RankingAnswersRound[];
};

export function defaultRankingAnswersConfig(): RankingAnswersConfig {
  return {
    promptCategory: "all",
    roundCount: 5,
    mistakeLimit: 5
  };
}

export function createRankingAnswersState(players: Player[], config: RankingAnswersConfig, seed: string): RankingAnswersState {
  const prompts = sample(getRankingPromptPool(config.promptCategory), config.roundCount, `${seed}:ranking-prompts`);
  const captainOrder = shuffle(
    players.map((player) => player.id),
    `${seed}:captains`
  );
  return {
    phase: "numberHandoff",
    config,
    currentRoundIndex: 0,
    currentPlayerIndex: 0,
    numberRevealDonePlayerIds: [],
    rounds: Array.from({ length: config.roundCount }, (_, roundIndex) => {
      const numbers = sample(
        Array.from({ length: 10 }, (_item, index) => index + 1),
        players.length,
        `${seed}:numbers:${roundIndex}`
      );
      return {
        roundIndex,
        captainPlayerId: captainOrder[roundIndex % captainOrder.length] ?? players[0]?.id ?? "",
        prompt: prompts[roundIndex % prompts.length],
        assignments: players.map((player, index) => ({ playerId: player.id, number: numbers[index] })),
        captainOrder: shuffle(
          players.map((player) => player.id),
          `${seed}:order:${roundIndex}`
        )
      };
    })
  };
}

export function currentRankingRound(state: RankingAnswersState) {
  return state.rounds[state.currentRoundIndex] ?? state.rounds[0];
}

export function updateCurrentRankingRound(state: RankingAnswersState, patch: Partial<RankingAnswersRound>): RankingAnswersState {
  return {
    ...state,
    rounds: state.rounds.map((round) => (round.roundIndex === state.currentRoundIndex ? { ...round, ...patch } : round))
  };
}

export function getRankingNumberForPlayer(state: RankingAnswersState, playerId: string) {
  return currentRankingRound(state).assignments.find((assignment) => assignment.playerId === playerId)?.number ?? 1;
}

export function updateRankingAnswerText(state: RankingAnswersState, playerId: string, answerText: string) {
  const round = currentRankingRound(state);
  return updateCurrentRankingRound(state, {
    assignments: round.assignments.map((assignment) => (assignment.playerId === playerId ? { ...assignment, answerText } : assignment))
  });
}

export function moveRankingOrder(state: RankingAnswersState, index: number, direction: -1 | 1) {
  const round = currentRankingRound(state);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= round.captainOrder.length) return state;
  const captainOrder = [...round.captainOrder];
  [captainOrder[index], captainOrder[nextIndex]] = [captainOrder[nextIndex], captainOrder[index]];
  return updateCurrentRankingRound(state, { captainOrder });
}

export function computeRankingMistakes(round: RankingAnswersRound) {
  const values = round.captainOrder.map((playerId) => round.assignments.find((assignment) => assignment.playerId === playerId)?.number ?? 1);
  return values.reduce((mistakes, value, index) => (index > 0 && value < values[index - 1] ? mistakes + 1 : mistakes), 0);
}

export function totalRankingMistakes(state: RankingAnswersState) {
  return state.rounds.reduce((sum, round) => sum + (round.mistakeCount ?? 0), 0);
}

function getRankingPromptPool(category: RankingAnswersConfig["promptCategory"]) {
  const prompts = rankingAnswerPrompts.filter((prompt) => prompt.enabled && (category === "all" || prompt.category === category));
  return prompts.length ? prompts : rankingAnswerPrompts.filter((prompt) => prompt.enabled);
}
