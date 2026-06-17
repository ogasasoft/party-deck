import { sample, shuffle } from "../core/random";
import { normalizeComparableText } from "../core/text";
import type { Player } from "../core/types";
import { oneWordClueWords, type OneWordClueCategory, type OneWordClueWord } from "../data/oneWordClueWords";

export type OneWordClueConfig = {
  wordCategory: "all" | OneWordClueCategory;
  roundCount: 5;
};

export type OneWordCluePhase =
  | "clueHandoff"
  | "clueEntry"
  | "reviewHandoff"
  | "clueReview"
  | "guesserHandoff"
  | "guess"
  | "roundResult"
  | "final";

export type OneWordClue = {
  playerId: string;
  text: string;
  autoCancelled: boolean;
  manualCancelled: boolean;
};

export type OneWordClueRound = {
  roundIndex: number;
  guesserPlayerId: string;
  cluePlayerIds: string[];
  target: OneWordClueWord;
  clues: OneWordClue[];
  guessText?: string;
  correct?: boolean;
};

export type OneWordClueState = {
  phase: OneWordCluePhase;
  config: OneWordClueConfig;
  currentRoundIndex: number;
  currentCluePlayerIndex: number;
  rounds: OneWordClueRound[];
};

export function defaultOneWordClueConfig(): OneWordClueConfig {
  return {
    wordCategory: "all",
    roundCount: 5
  };
}

export function createOneWordClueState(players: Player[], config: OneWordClueConfig, seed: string): OneWordClueState {
  const targets = sample(getWordPool(config.wordCategory), config.roundCount, `${seed}:one-word-targets`);
  const guesserOrder = shuffle(
    players.map((player) => player.id),
    `${seed}:one-word-guessers`
  );
  return {
    phase: "clueHandoff",
    config,
    currentRoundIndex: 0,
    currentCluePlayerIndex: 0,
    rounds: Array.from({ length: config.roundCount }, (_, roundIndex) => {
      const guesserPlayerId = guesserOrder[roundIndex % guesserOrder.length] ?? players[0]?.id ?? "";
      return {
        roundIndex,
        guesserPlayerId,
        cluePlayerIds: players.filter((player) => player.id !== guesserPlayerId).map((player) => player.id),
        target: targets[roundIndex % targets.length],
        clues: []
      };
    })
  };
}

export function currentOneWordClueRound(state: OneWordClueState) {
  return state.rounds[state.currentRoundIndex] ?? state.rounds[0];
}

export function currentOneWordCluePlayerId(state: OneWordClueState) {
  const round = currentOneWordClueRound(state);
  return round.cluePlayerIds[state.currentCluePlayerIndex] ?? round.cluePlayerIds[0] ?? "";
}

export function submitOneWordClue(state: OneWordClueState, playerId: string, text: string): OneWordClueState {
  const round = currentOneWordClueRound(state);
  const clues = applyAutomaticCancellations([
    ...round.clues.filter((clue) => clue.playerId !== playerId),
    { playerId, text: text.trim(), autoCancelled: false, manualCancelled: false }
  ]);
  return updateCurrentRound(state, { clues });
}

export function toggleOneWordClueCancelled(state: OneWordClueState, playerId: string): OneWordClueState {
  const round = currentOneWordClueRound(state);
  return updateCurrentRound(state, {
    clues: round.clues.map((clue) => (clue.playerId === playerId && !clue.autoCancelled ? { ...clue, manualCancelled: !clue.manualCancelled } : clue))
  });
}

export function activeOneWordClues(state: OneWordClueState) {
  return currentOneWordClueRound(state).clues.filter((clue) => !clue.autoCancelled && !clue.manualCancelled);
}

export function submitOneWordGuess(state: OneWordClueState, guessText: string): OneWordClueState {
  const round = currentOneWordClueRound(state);
  const correct = normalizeComparableText(guessText) === normalizeComparableText(round.target.text);
  return { ...updateCurrentRound(state, { guessText: guessText.trim(), correct }), phase: "roundResult" };
}

export function advanceOneWordClueRound(state: OneWordClueState): OneWordClueState {
  const isLast = state.currentRoundIndex >= state.rounds.length - 1;
  return {
    ...state,
    phase: isLast ? "final" : "clueHandoff",
    currentRoundIndex: isLast ? state.currentRoundIndex : state.currentRoundIndex + 1,
    currentCluePlayerIndex: 0
  };
}

export function totalOneWordClueCorrect(state: OneWordClueState) {
  return state.rounds.filter((round) => round.correct).length;
}

function updateCurrentRound(state: OneWordClueState, patch: Partial<OneWordClueRound>): OneWordClueState {
  return {
    ...state,
    rounds: state.rounds.map((round) => (round.roundIndex === state.currentRoundIndex ? { ...round, ...patch } : round))
  };
}

function applyAutomaticCancellations(clues: OneWordClue[]) {
  const counts = new Map<string, number>();
  clues.forEach((clue) => {
    const key = normalizeComparableText(clue.text);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return clues.map((clue) => ({
    ...clue,
    autoCancelled: (counts.get(normalizeComparableText(clue.text)) ?? 0) > 1
  }));
}

function getWordPool(category: OneWordClueConfig["wordCategory"]) {
  const words = oneWordClueWords.filter((word) => word.enabled && (category === "all" || word.category === category));
  return words.length ? words : oneWordClueWords.filter((word) => word.enabled);
}
