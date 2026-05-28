import { createRandom, sample, shuffle } from "../core/random";
import { Player } from "../core/types";
import { SpectrumScale, SpectrumScaleCategory, spectrumScales } from "../data/spectrumScales";

export type SpectrumMeterConfig = {
  scaleCategory: "all" | SpectrumScaleCategory;
  roundCount: 3 | 5;
};

export type SpectrumMeterPhase = "psychicHandoff" | "psychicReveal" | "clue" | "guess" | "roundResult" | "final";

export type SpectrumMeterRound = {
  roundIndex: number;
  psychicPlayerId: string;
  scale: SpectrumScale;
  targetValue: number;
  clue?: string;
  guessValue?: number;
  score?: number;
};

export type SpectrumMeterState = {
  phase: SpectrumMeterPhase;
  config: SpectrumMeterConfig;
  currentRoundIndex: number;
  rounds: SpectrumMeterRound[];
};

export function defaultSpectrumMeterConfig(): SpectrumMeterConfig {
  return {
    scaleCategory: "all",
    roundCount: 3
  };
}

export function createSpectrumMeterState(players: Player[], config: SpectrumMeterConfig, seed: string): SpectrumMeterState {
  const scales = getSpectrumScalePool(config.scaleCategory);
  const selectedScales = sample(scales, Math.min(config.roundCount, scales.length), `${seed}:scales`);
  const random = createRandom(`${seed}:targets`);
  const psychicOrder = shuffle(
    players.map((player) => player.id),
    `${seed}:psychic-order`
  );
  return {
    phase: "psychicHandoff",
    config,
    currentRoundIndex: 0,
    rounds: Array.from({ length: config.roundCount }, (_, index) => ({
      roundIndex: index,
      psychicPlayerId: psychicOrder[index % psychicOrder.length] ?? players[0]?.id ?? "",
      scale: selectedScales[index % selectedScales.length],
      targetValue: Math.round(random() * 100)
    }))
  };
}

export function currentSpectrumRound(state: SpectrumMeterState) {
  return state.rounds[state.currentRoundIndex] ?? state.rounds[0];
}

export function updateCurrentSpectrumRound(state: SpectrumMeterState, patch: Partial<SpectrumMeterRound>): SpectrumMeterState {
  return {
    ...state,
    rounds: state.rounds.map((round) => (round.roundIndex === state.currentRoundIndex ? { ...round, ...patch } : round))
  };
}

export function scoreSpectrumGuess(targetValue: number, guessValue: number) {
  const delta = Math.abs(targetValue - guessValue);
  if (delta <= 4) return 4;
  if (delta <= 10) return 3;
  if (delta <= 16) return 2;
  if (delta <= 24) return 1;
  return 0;
}

export function totalSpectrumScore(state: SpectrumMeterState) {
  return state.rounds.reduce((sum, round) => sum + (round.score ?? 0), 0);
}

function getSpectrumScalePool(category: SpectrumMeterConfig["scaleCategory"]) {
  const scales = spectrumScales.filter((scale) => scale.enabled && (category === "all" || scale.category === category));
  return scales.length ? scales : spectrumScales.filter((scale) => scale.enabled);
}
