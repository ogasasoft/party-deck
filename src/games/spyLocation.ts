import { sample } from "../core/random";
import { Player } from "../core/types";
import { SpyLocation, SpyLocationCategory, spyLocations } from "../data/spyLocations";

export type SpyLocationConfig = {
  locationCategory: "all" | SpyLocationCategory;
  questionTimeSec: 480 | 600;
};

export type SpyLocationPhase = "handoff" | "revealSecret" | "question" | "accuse" | "accusationVoteHandoff" | "accusationVote" | "spyGuessHandoff" | "spyGuess" | "result";

export type SpyLocationAccusationVote = {
  fromPlayerId: string;
  agrees: boolean;
};

export type SpyLocationState = {
  phase: SpyLocationPhase;
  config: SpyLocationConfig;
  location: SpyLocation;
  spyPlayerId: string;
  currentPlayerIndex: number;
  revealViewedPlayerIds: string[];
  accusedPlayerId?: string;
  accusationVotes: SpyLocationAccusationVote[];
  spyGuessLocationId?: string;
};

export type SpyLocationResult = {
  winningTeam: "locals" | "spy";
  reason: string;
};

export function defaultSpyLocationConfig(): SpyLocationConfig {
  return {
    locationCategory: "all",
    questionTimeSec: 480
  };
}

export function createSpyLocationState(players: Player[], config: SpyLocationConfig, seed: string): SpyLocationState {
  const locations = getSpyLocationPool(config.locationCategory);
  const location = sample(locations, 1, `${seed}:spy-location`)[0];
  const spyPlayerId = sample(players, 1, `${seed}:spy-player`)[0]?.id ?? players[0]?.id ?? "";
  return {
    phase: "handoff",
    config,
    location,
    spyPlayerId,
    currentPlayerIndex: 0,
    revealViewedPlayerIds: [],
    accusationVotes: []
  };
}

export function isSpyLocationSpy(state: SpyLocationState, playerId: string) {
  return state.spyPlayerId === playerId;
}

export function getSpyLocationChoices(state: SpyLocationState) {
  return getSpyLocationPool(state.config.locationCategory);
}

export function submitSpyLocationAccusationVote(state: SpyLocationState, vote: SpyLocationAccusationVote) {
  return {
    ...state,
    accusationVotes: [...state.accusationVotes.filter((item) => item.fromPlayerId !== vote.fromPlayerId), vote]
  };
}

export function hasSpyLocationAccusationConsensus(state: SpyLocationState, playerCount: number) {
  const requiredVotes = Math.max(0, playerCount - 1);
  const eligibleVotes = state.accusationVotes.filter((vote) => vote.fromPlayerId !== state.accusedPlayerId);
  return eligibleVotes.length >= requiredVotes && eligibleVotes.every((vote) => vote.agrees);
}

export function judgeSpyLocation(state: SpyLocationState, playerCount: number): SpyLocationResult {
  if (state.accusedPlayerId && hasSpyLocationAccusationConsensus(state, playerCount)) {
    if (state.accusedPlayerId === state.spyPlayerId) {
      return { winningTeam: "locals", reason: "告発でスパイを見つけたため、場所を知る側の勝利です。" };
    }
    return { winningTeam: "spy", reason: "スパイではない人を告発したため、スパイ側の勝利です。" };
  }
  if (state.spyGuessLocationId) {
    if (state.spyGuessLocationId === state.location.id) {
      return { winningTeam: "spy", reason: "スパイが正しい場所を当てたため、スパイ側の勝利です。" };
    }
    return { winningTeam: "locals", reason: "スパイが場所を外したため、場所を知る側の勝利です。" };
  }
  return { winningTeam: "spy", reason: "決着条件が満たされていません。" };
}

function getSpyLocationPool(category: SpyLocationConfig["locationCategory"]) {
  const locations = spyLocations.filter((location) => location.enabled && (category === "all" || location.category === category));
  return locations.length ? locations : spyLocations.filter((location) => location.enabled);
}
