import { createRandom, shuffle } from "../core/random";
import { Player } from "../core/types";
import { SpectrumScale, SpectrumScaleCategory, spectrumScales } from "../data/spectrumScales";

export type SpectrumTeamId = "a" | "b";
export type SpectrumDirection = "left" | "right";

export type SpectrumMeterConfig = {
  scaleCategory: "all" | SpectrumScaleCategory;
};

export type SpectrumMeterPhase =
  | "teamReveal"
  | "psychicHandoff"
  | "psychicReveal"
  | "clue"
  | "teamGuessHandoff"
  | "guess"
  | "opponentGuessHandoff"
  | "opponentGuess"
  | "roundResult"
  | "final";

export type SpectrumMeterRound = {
  roundIndex: number;
  activeTeamId: SpectrumTeamId;
  psychicPlayerId: string;
  scale: SpectrumScale;
  targetValue: number;
  clue?: string;
  guessValue?: number;
  opponentGuess?: SpectrumDirection;
  psychicTeamScore?: number;
  opponentTeamScore?: number;
};

export type SpectrumMeterState = {
  phase: SpectrumMeterPhase;
  config: SpectrumMeterConfig;
  seed: string;
  currentRoundIndex: number;
  rounds: SpectrumMeterRound[];
  teamPlayerIds: Record<SpectrumTeamId, string[]>;
  teamScores: Record<SpectrumTeamId, number>;
  suddenDeathTurnsRemaining?: number;
  winningTeamId?: SpectrumTeamId;
};

export function defaultSpectrumMeterConfig(): SpectrumMeterConfig {
  return {
    scaleCategory: "all"
  };
}

export function createSpectrumMeterState(players: Player[], config: SpectrumMeterConfig, seed: string): SpectrumMeterState {
  const shuffledPlayerIds = shuffle(
    players.map((player) => player.id),
    `${seed}:teams`
  );
  const teamPlayerIds: Record<SpectrumTeamId, string[]> = {
    a: shuffledPlayerIds.filter((_playerId, index) => index % 2 === 0),
    b: shuffledPlayerIds.filter((_playerId, index) => index % 2 === 1)
  };
  const state: SpectrumMeterState = {
    phase: "teamReveal",
    config: normalizeSpectrumMeterConfig(config),
    seed,
    currentRoundIndex: 0,
    rounds: [],
    teamPlayerIds,
    teamScores: { a: 0, b: 1 }
  };
  state.rounds = [createSpectrumRound(state, "a")];
  return state;
}

export function normalizeSpectrumMeterConfig(config: Partial<SpectrumMeterConfig> | null | undefined): SpectrumMeterConfig {
  const category = config?.scaleCategory;
  return {
    scaleCategory: category && (category === "all" || spectrumScales.some((scale) => scale.category === category)) ? category : "all"
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

export function getSpectrumTeamPlayerIds(state: SpectrumMeterState, teamId: SpectrumTeamId) {
  return state.teamPlayerIds[teamId] ?? [];
}

export function otherSpectrumTeam(teamId: SpectrumTeamId): SpectrumTeamId {
  return teamId === "a" ? "b" : "a";
}

export function scoreSpectrumGuess(targetValue: number, guessValue: number) {
  const delta = Math.abs(targetValue - guessValue);
  if (delta <= 4) return 4;
  if (delta <= 10) return 3;
  if (delta <= 16) return 2;
  return 0;
}

export function scoreSpectrumRound(state: SpectrumMeterState, opponentGuess: SpectrumDirection): SpectrumMeterState {
  const round = currentSpectrumRound(state);
  const guessValue = round.guessValue ?? 50;
  const psychicTeamScore = scoreSpectrumGuess(round.targetValue, guessValue);
  const targetDirection = getSpectrumTargetDirection(round.targetValue, guessValue);
  const opponentTeamScore = psychicTeamScore === 4 || !targetDirection || targetDirection !== opponentGuess ? 0 : 1;
  const opponentTeamId = otherSpectrumTeam(round.activeTeamId);

  return {
    ...updateCurrentSpectrumRound(state, {
      guessValue,
      opponentGuess,
      psychicTeamScore,
      opponentTeamScore
    }),
    phase: "roundResult",
    teamScores: {
      ...state.teamScores,
      [round.activeTeamId]: state.teamScores[round.activeTeamId] + psychicTeamScore,
      [opponentTeamId]: state.teamScores[opponentTeamId] + opponentTeamScore
    }
  };
}

export function advanceSpectrumRound(state: SpectrumMeterState): SpectrumMeterState {
  const round = currentSpectrumRound(state);
  const opponentTeamId = otherSpectrumTeam(round.activeTeamId);
  const scores = state.teamScores;

  if (state.suddenDeathTurnsRemaining) {
    const remaining = state.suddenDeathTurnsRemaining - 1;
    if (remaining === 0 && scores.a !== scores.b) {
      return {
        ...state,
        phase: "final",
        suddenDeathTurnsRemaining: 0,
        winningTeamId: scores.a > scores.b ? "a" : "b"
      };
    }
    return appendSpectrumRound(state, opponentTeamId, remaining === 0 ? 2 : remaining);
  }

  if (Math.max(scores.a, scores.b) >= 10) {
    if (scores.a !== scores.b) {
      return {
        ...state,
        phase: "final",
        winningTeamId: scores.a > scores.b ? "a" : "b"
      };
    }
    return appendSpectrumRound(state, opponentTeamId, 2);
  }

  const catchUpTriggered = round.psychicTeamScore === 4 && scores[round.activeTeamId] < scores[opponentTeamId];
  return appendSpectrumRound(state, catchUpTriggered ? round.activeTeamId : opponentTeamId);
}

export function getSpectrumTargetDirection(targetValue: number, guessValue: number): SpectrumDirection | null {
  if (targetValue === guessValue) return null;
  return targetValue < guessValue ? "left" : "right";
}

export function totalSpectrumScore(state: SpectrumMeterState) {
  return state.teamScores.a + state.teamScores.b;
}

function appendSpectrumRound(state: SpectrumMeterState, activeTeamId: SpectrumTeamId, suddenDeathTurnsRemaining = state.suddenDeathTurnsRemaining) {
  const nextRound = createSpectrumRound(state, activeTeamId);
  return {
    ...state,
    phase: "psychicHandoff" as const,
    currentRoundIndex: nextRound.roundIndex,
    rounds: [...state.rounds, nextRound],
    suddenDeathTurnsRemaining
  };
}

function createSpectrumRound(state: SpectrumMeterState, activeTeamId: SpectrumTeamId): SpectrumMeterRound {
  const roundIndex = state.rounds.length;
  const teamPlayerIds = getSpectrumTeamPlayerIds(state, activeTeamId);
  const previousTeamRounds = state.rounds.filter((round) => round.activeTeamId === activeTeamId).length;
  const scalePool = getSpectrumScalePool(state.config.scaleCategory);
  const random = createRandom(`${state.seed}:round:${roundIndex}`);
  return {
    roundIndex,
    activeTeamId,
    psychicPlayerId: teamPlayerIds[previousTeamRounds % teamPlayerIds.length] ?? teamPlayerIds[0] ?? "",
    scale: scalePool[Math.floor(random() * scalePool.length)] ?? spectrumScales[0],
    targetValue: Math.round(random() * 100)
  };
}

function getSpectrumScalePool(category: SpectrumMeterConfig["scaleCategory"]) {
  const scales = spectrumScales.filter((scale) => scale.enabled && (category === "all" || scale.category === category));
  return scales.length ? scales : spectrumScales.filter((scale) => scale.enabled);
}
