import { sample } from "../core/random";
import { normalizeComparableText } from "../core/text";
import type { Player } from "../core/types";
import { majorityMatchPrompts, type MajorityMatchCategory, type MajorityMatchPrompt } from "../data/majorityMatchPrompts";

export type MajorityMatchConfig = {
  promptCategory: "all" | MajorityMatchCategory;
  roundCount: 5;
};

export type MajorityMatchPhase = "answerHandoff" | "answer" | "roundResult" | "final";

export type MajorityMatchAnswer = {
  playerId: string;
  text: string;
};

export type MajorityMatchRound = {
  roundIndex: number;
  prompt: MajorityMatchPrompt;
  answers: MajorityMatchAnswer[];
};

export type MajorityMatchState = {
  phase: MajorityMatchPhase;
  config: MajorityMatchConfig;
  currentRoundIndex: number;
  currentPlayerIndex: number;
  rounds: MajorityMatchRound[];
};

export type MajorityMatchRoundResult = {
  largestGroupSize: number;
  winningKeys: string[];
  pointsByPlayerId: Record<string, number>;
};

export function defaultMajorityMatchConfig(): MajorityMatchConfig {
  return {
    promptCategory: "all",
    roundCount: 5
  };
}

export function createMajorityMatchState(players: Player[], config: MajorityMatchConfig, seed: string): MajorityMatchState {
  const prompts = sample(getPromptPool(config.promptCategory), config.roundCount, `${seed}:majority-prompts`);
  return {
    phase: "answerHandoff",
    config,
    currentRoundIndex: 0,
    currentPlayerIndex: 0,
    rounds: Array.from({ length: config.roundCount }, (_, roundIndex) => ({
      roundIndex,
      prompt: prompts[roundIndex % prompts.length],
      answers: []
    }))
  };
}

export function currentMajorityMatchRound(state: MajorityMatchState) {
  return state.rounds[state.currentRoundIndex] ?? state.rounds[0];
}

export function submitMajorityMatchAnswer(state: MajorityMatchState, answer: MajorityMatchAnswer): MajorityMatchState {
  const round = currentMajorityMatchRound(state);
  const answers = [...round.answers.filter((item) => item.playerId !== answer.playerId), answer];
  return {
    ...state,
    rounds: state.rounds.map((item) => (item.roundIndex === round.roundIndex ? { ...item, answers } : item))
  };
}

export function scoreMajorityMatchRound(round: MajorityMatchRound): MajorityMatchRoundResult {
  const counts = new Map<string, number>();
  round.answers.forEach((answer) => {
    const key = normalizeComparableText(answer.text);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const largestGroupSize = Math.max(0, ...counts.values());
  const winningKeys = largestGroupSize >= 2 ? [...counts.entries()].filter(([, count]) => count === largestGroupSize).map(([key]) => key) : [];
  const winningSet = new Set(winningKeys);
  const pointsByPlayerId = Object.fromEntries(
    round.answers.map((answer) => [answer.playerId, winningSet.has(normalizeComparableText(answer.text)) ? 1 : 0])
  );
  return { largestGroupSize, winningKeys, pointsByPlayerId };
}

export function totalMajorityMatchScore(state: MajorityMatchState, playerId: string) {
  return state.rounds.reduce((total, round) => total + (scoreMajorityMatchRound(round).pointsByPlayerId[playerId] ?? 0), 0);
}

export function advanceMajorityMatchRound(state: MajorityMatchState): MajorityMatchState {
  const isLast = state.currentRoundIndex >= state.rounds.length - 1;
  return {
    ...state,
    phase: isLast ? "final" : "answerHandoff",
    currentRoundIndex: isLast ? state.currentRoundIndex : state.currentRoundIndex + 1,
    currentPlayerIndex: 0
  };
}

function getPromptPool(category: MajorityMatchConfig["promptCategory"]) {
  const prompts = majorityMatchPrompts.filter((prompt) => prompt.enabled && (category === "all" || prompt.category === category));
  return prompts.length ? prompts : majorityMatchPrompts.filter((prompt) => prompt.enabled);
}
