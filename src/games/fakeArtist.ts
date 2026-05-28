import { sample, shuffle } from "../core/random";
import { Player } from "../core/types";
import { FakeArtistCategory, FakeArtistTopic, fakeArtistTopics } from "../data/fakeArtistTopics";

export type DrawingPoint = {
  x: number;
  y: number;
};

export type FakeArtistStroke = {
  playerId: string;
  color: string;
  points: DrawingPoint[];
};

export type FakeArtistConfig = {
  topicCategory: "all" | FakeArtistCategory;
  strokesPerPlayer: 2;
};

export type FakeArtistPhase = "handoff" | "revealSecret" | "draw" | "voteHandoff" | "vote" | "fakeGuess" | "result";

export type FakeArtistVote = {
  fromPlayerId: string;
  targetPlayerId: string;
};

export type FakeArtistState = {
  phase: FakeArtistPhase;
  config: FakeArtistConfig;
  topic: FakeArtistTopic;
  fakeArtistPlayerId: string;
  currentPlayerIndex: number;
  revealViewedPlayerIds: string[];
  drawOrder: string[];
  currentStrokeIndex: number;
  strokes: FakeArtistStroke[];
  votes: FakeArtistVote[];
  fakeGuess?: string;
};

export type FakeArtistResult = {
  caught: boolean;
  guessCorrect: boolean;
  topVotedPlayerIds: string[];
  winningTeam: "artists" | "fake";
  reason: string;
};

export function defaultFakeArtistConfig(): FakeArtistConfig {
  return {
    topicCategory: "all",
    strokesPerPlayer: 2
  };
}

export function createFakeArtistState(players: Player[], config: FakeArtistConfig, seed: string): FakeArtistState {
  const topics = fakeArtistTopics.filter((topic) => topic.enabled && (config.topicCategory === "all" || topic.category === config.topicCategory));
  const topic = sample(topics.length ? topics : fakeArtistTopics.filter((item) => item.enabled), 1, `${seed}:fake-topic`)[0];
  const fakeArtistPlayerId = sample(players, 1, `${seed}:fake-player`)[0]?.id ?? players[0]?.id ?? "";
  const baseOrder = shuffle(
    players.map((player) => player.id),
    `${seed}:draw-order`
  );
  return {
    phase: "handoff",
    config,
    topic,
    fakeArtistPlayerId,
    currentPlayerIndex: 0,
    revealViewedPlayerIds: [],
    drawOrder: Array.from({ length: config.strokesPerPlayer }).flatMap(() => baseOrder),
    currentStrokeIndex: 0,
    strokes: [],
    votes: []
  };
}

export function isFakeArtist(state: FakeArtistState, playerId: string) {
  return state.fakeArtistPlayerId === playerId;
}

export function currentDrawingPlayerId(state: FakeArtistState) {
  return state.drawOrder[state.currentStrokeIndex] ?? state.drawOrder[0] ?? "";
}

export function submitFakeArtistVote(state: FakeArtistState, vote: FakeArtistVote) {
  return {
    ...state,
    votes: [...state.votes.filter((item) => item.fromPlayerId !== vote.fromPlayerId), vote]
  };
}

export function tallyFakeArtistVotes(state: FakeArtistState) {
  const counts = new Map<string, number>();
  state.votes.forEach((vote) => {
    counts.set(vote.targetPlayerId, (counts.get(vote.targetPlayerId) ?? 0) + 1);
  });
  const maxVotes = Math.max(0, ...counts.values());
  return {
    counts,
    maxVotes,
    topVotedPlayerIds: [...counts.entries()].filter(([, count]) => count === maxVotes && maxVotes > 0).map(([playerId]) => playerId)
  };
}

export function judgeFakeArtist(state: FakeArtistState): FakeArtistResult {
  const { topVotedPlayerIds } = tallyFakeArtistVotes(state);
  const caught = topVotedPlayerIds.includes(state.fakeArtistPlayerId);
  const guessCorrect = normalizeGuess(state.fakeGuess ?? "") === normalizeGuess(state.topic.text);
  const fakeWins = !caught || guessCorrect;
  return {
    caught,
    guessCorrect,
    topVotedPlayerIds,
    winningTeam: fakeWins ? "fake" : "artists",
    reason: getResultReason(caught, guessCorrect)
  };
}

function getResultReason(caught: boolean, guessCorrect: boolean) {
  if (!caught) return "偽物を最多票にできなかったため、偽物側の勝利です。";
  if (guessCorrect) return "偽物は見つかりましたが、お題を当てたため偽物側の勝利です。";
  return "偽物を見つけ、お題も守れたため本物側の勝利です。";
}

function normalizeGuess(value: string) {
  return value.trim().normalize("NFKC").replace(/\s/g, "").toLowerCase();
}
