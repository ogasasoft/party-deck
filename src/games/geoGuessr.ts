import { distanceMeters, geoScore } from "../core/distance";
import { Player } from "../core/types";
import { sample } from "../core/random";
import { fallbackGeoLocations } from "../data/geoLocations";

export type GeoConfig = {
  rounds: 1;
  timeLimitSec: 0 | 30 | 60 | 90;
  movementMode: "no-move";
};

export type GeoLocation = {
  id: string;
  provider: "mapillary";
  mapillaryImageId: string;
  lat: number;
  lng: number;
  heading?: number;
  region?: string;
  prefecture?: string;
  difficulty: "easy" | "normal" | "hard";
  tags: string[];
  enabled: boolean;
  qaStatus: "unreviewed" | "approved" | "rejected";
  source: "manual" | "generated";
  chunkId: string;
};

export type GeoLocationIndexItem = {
  id: string;
  lat: number;
  lng: number;
  prefecture?: string;
  region?: string;
  difficulty: "easy" | "normal" | "hard";
  tags: string[];
  chunkId: string;
};

export type GeoAnswer = {
  playerId: string;
  roundIndex: number;
  guessLat: number;
  guessLng: number;
  distanceMeters: number;
  score: number;
  submittedAt: string;
};

export type GeoPhase = "setup" | "handoff" | "viewingImage" | "placingPin" | "confirmGuess" | "roundResult" | "gameResult";

export type GeoState = {
  phase: GeoPhase;
  config: GeoConfig;
  currentRoundIndex: number;
  currentPlayerIndex: number;
  roundLocations: GeoLocation[];
  answers: GeoAnswer[];
  pendingGuess?: { lat: number; lng: number };
};

export function defaultGeoConfig(): GeoConfig {
  return {
    rounds: 1,
    timeLimitSec: 60,
    movementMode: "no-move"
  };
}

export function createGeoState(_players: Player[], config: GeoConfig, seed: string, locations = fallbackGeoLocations): GeoState {
  const playable = locations.filter((location) => location.enabled && location.qaStatus !== "rejected");
  return {
    phase: "handoff",
    config,
    currentRoundIndex: 0,
    currentPlayerIndex: 0,
    roundLocations: sample(playable, config.rounds, `${seed}:geo-locations`),
    answers: []
  };
}

export function currentGeoLocation(state: GeoState) {
  return state.roundLocations[state.currentRoundIndex] ?? state.roundLocations[0];
}

export function createGeoAnswer(state: GeoState, playerId: string, guess: { lat: number; lng: number }): GeoAnswer {
  const location = currentGeoLocation(state);
  const meters = distanceMeters({ lat: location.lat, lng: location.lng }, guess);
  return {
    playerId,
    roundIndex: state.currentRoundIndex,
    guessLat: guess.lat,
    guessLng: guess.lng,
    distanceMeters: Math.round(meters),
    score: geoScore(meters),
    submittedAt: new Date().toISOString()
  };
}

export function roundAnswers(state: GeoState) {
  return state.answers.filter((answer) => answer.roundIndex === state.currentRoundIndex);
}

export function totalGeoScore(state: GeoState, playerId: string) {
  return state.answers.filter((answer) => answer.playerId === playerId).reduce((sum, answer) => sum + answer.score, 0);
}
