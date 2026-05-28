import { sample } from "../core/random";
import { Player } from "../core/types";
import { InsiderAnswer, InsiderAnswerCategory, insiderAnswers } from "../data/insiderAnswers";

export type InsiderRole = "master" | "insider" | "citizen";

export type InsiderGuessConfig = {
  answerCategory: "all" | InsiderAnswerCategory;
  questionTimeSec: 300 | 480;
  discussionTimeSec: 120 | 180;
};

export type InsiderGuessPhase = "roleHandoff" | "roleReveal" | "answerHandoff" | "answerReveal" | "question" | "discussion" | "voteHandoff" | "vote" | "result";

export type InsiderGuessVote = {
  fromPlayerId: string;
  targetPlayerId: string;
};

export type InsiderGuessState = {
  phase: InsiderGuessPhase;
  config: InsiderGuessConfig;
  answer: InsiderAnswer;
  masterPlayerId: string;
  insiderPlayerId: string;
  currentPlayerIndex: number;
  roleRevealDonePlayerIds: string[];
  answerRevealDonePlayerIds: string[];
  guessedCorrectly: boolean | null;
  votes: InsiderGuessVote[];
};

export type InsiderGuessResult = {
  winningTeam: "citizens" | "insider" | "failed";
  topVotedPlayerIds: string[];
  reason: string;
};

export function defaultInsiderGuessConfig(): InsiderGuessConfig {
  return {
    answerCategory: "all",
    questionTimeSec: 300,
    discussionTimeSec: 120
  };
}

export function createInsiderGuessState(players: Player[], config: InsiderGuessConfig, seed: string): InsiderGuessState {
  const answers = insiderAnswers.filter((answer) => answer.enabled && (config.answerCategory === "all" || answer.category === config.answerCategory));
  const answer = sample(answers.length ? answers : insiderAnswers.filter((item) => item.enabled), 1, `${seed}:insider-answer`)[0];
  const masterPlayer = sample(players, 1, `${seed}:master`)[0] ?? players[0];
  const insiderPlayer = sample(
    players.filter((player) => player.id !== masterPlayer.id),
    1,
    `${seed}:insider`
  )[0] ?? players.find((player) => player.id !== masterPlayer.id) ?? masterPlayer;
  return {
    phase: "roleHandoff",
    config,
    answer,
    masterPlayerId: masterPlayer.id,
    insiderPlayerId: insiderPlayer.id,
    currentPlayerIndex: 0,
    roleRevealDonePlayerIds: [],
    answerRevealDonePlayerIds: [],
    guessedCorrectly: null,
    votes: []
  };
}

export function getInsiderRole(state: InsiderGuessState, playerId: string): InsiderRole {
  if (state.masterPlayerId === playerId) return "master";
  if (state.insiderPlayerId === playerId) return "insider";
  return "citizen";
}

export function canViewInsiderAnswer(state: InsiderGuessState, playerId: string) {
  const role = getInsiderRole(state, playerId);
  return role === "master" || role === "insider";
}

export function submitInsiderGuessVote(state: InsiderGuessState, vote: InsiderGuessVote) {
  return {
    ...state,
    votes: [...state.votes.filter((item) => item.fromPlayerId !== vote.fromPlayerId), vote]
  };
}

export function tallyInsiderGuessVotes(state: InsiderGuessState) {
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

export function judgeInsiderGuess(state: InsiderGuessState): InsiderGuessResult {
  if (!state.guessedCorrectly) {
    return {
      winningTeam: "failed",
      topVotedPlayerIds: [],
      reason: "時間内に答えへたどり着けなかったため、全員失敗です。"
    };
  }
  const { topVotedPlayerIds } = tallyInsiderGuessVotes(state);
  const insiderFound = topVotedPlayerIds.includes(state.insiderPlayerId);
  return {
    winningTeam: insiderFound ? "citizens" : "insider",
    topVotedPlayerIds,
    reason: insiderFound ? "答えを見つけたあと、インサイダーも見つけたため市民側の勝利です。" : "答えは見つかりましたが、インサイダーを外したためインサイダー側の勝利です。"
  };
}
