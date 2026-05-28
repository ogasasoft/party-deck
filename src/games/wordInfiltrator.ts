import { sample, shuffle } from "../core/random";
import { Player } from "../core/types";
import { WordInfiltratorCategory, WordInfiltratorTopic, wordInfiltratorTopics } from "../data/wordInfiltratorTopics";

export type WordInfiltratorConfig = {
  topicCategory: "all" | WordInfiltratorCategory;
  discussionTimeSec: 180 | 300;
};

export type WordInfiltratorPhase =
  | "handoff"
  | "revealSecret"
  | "clue"
  | "discussion"
  | "voteHandoff"
  | "vote"
  | "infiltratorGuess"
  | "result";

export type WordInfiltratorVote = {
  fromPlayerId: string;
  targetPlayerId: string;
};

export type WordInfiltratorState = {
  phase: WordInfiltratorPhase;
  config: WordInfiltratorConfig;
  topic: WordInfiltratorTopic;
  infiltratorPlayerId: string;
  currentPlayerIndex: number;
  revealViewedPlayerIds: string[];
  clueOrder: string[];
  votes: WordInfiltratorVote[];
  infiltratorGuess?: string;
};

export type WordInfiltratorResult = {
  caught: boolean;
  guessCorrect: boolean;
  topVotedPlayerIds: string[];
  winningTeam: "majority" | "infiltrator";
  reason: string;
};

export function defaultWordInfiltratorConfig(): WordInfiltratorConfig {
  return {
    topicCategory: "all",
    discussionTimeSec: 180
  };
}

export function createWordInfiltratorState(players: Player[], config: WordInfiltratorConfig, seed: string): WordInfiltratorState {
  const topics = wordInfiltratorTopics.filter((topic) => topic.enabled && (config.topicCategory === "all" || topic.category === config.topicCategory));
  const topic = sample(topics.length ? topics : wordInfiltratorTopics.filter((item) => item.enabled), 1, `${seed}:word-topic`)[0];
  const infiltratorPlayerId = sample(players, 1, `${seed}:infiltrator`)[0]?.id ?? players[0]?.id ?? "";
  return {
    phase: "handoff",
    config,
    topic,
    infiltratorPlayerId,
    currentPlayerIndex: 0,
    revealViewedPlayerIds: [],
    clueOrder: shuffle(
      players.map((player) => player.id),
      `${seed}:clue-order`
    ),
    votes: []
  };
}

export function isWordInfiltrator(state: WordInfiltratorState, playerId: string) {
  return state.infiltratorPlayerId === playerId;
}

export function submitWordInfiltratorVote(state: WordInfiltratorState, vote: WordInfiltratorVote) {
  return {
    ...state,
    votes: [...state.votes.filter((item) => item.fromPlayerId !== vote.fromPlayerId), vote]
  };
}

export function tallyWordInfiltratorVotes(state: WordInfiltratorState) {
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

export function judgeWordInfiltrator(state: WordInfiltratorState): WordInfiltratorResult {
  const { topVotedPlayerIds } = tallyWordInfiltratorVotes(state);
  const caught = topVotedPlayerIds.includes(state.infiltratorPlayerId);
  const guessCorrect = normalizeGuess(state.infiltratorGuess ?? "") === normalizeGuess(state.topic.secretWord);
  const infiltratorWins = !caught || guessCorrect;
  return {
    caught,
    guessCorrect,
    topVotedPlayerIds,
    winningTeam: infiltratorWins ? "infiltrator" : "majority",
    reason: getResultReason(caught, guessCorrect)
  };
}

function getResultReason(caught: boolean, guessCorrect: boolean) {
  if (!caught) return "潜入者を最多票にできなかったため、潜入者側の勝利です。";
  if (guessCorrect) return "潜入者は見つかりましたが、秘密の言葉を当てたため潜入者側の勝利です。";
  return "潜入者を見つけ、秘密の言葉も守れたため多数派の勝利です。";
}

function normalizeGuess(value: string) {
  return value.trim().normalize("NFKC").replace(/\s/g, "").toLowerCase();
}
