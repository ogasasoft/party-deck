import { Player } from "../core/types";
import { sample, shuffle } from "../core/random";
import { numberTalkTopics } from "../data/numberTopics";

export type NumberTalkCategory = "normal" | "twist" | "love";

export type NumberTalkConfig = {
  numberMin: 1;
  numberMax: 100;
  cardsPerPlayer: 1;
  topicCategory: NumberTalkCategory;
  topicId?: string;
  discussionTimeSec: 180 | 300;
};

export type NumberTalkTopic = {
  id: string;
  category: NumberTalkCategory;
  text: string;
  lowLabel?: string;
  highLabel?: string;
  enabled: boolean;
};

export type NumberAssignment = {
  playerId: string;
  number: number;
};

export type NumberTalkPhase =
  | "setup"
  | "handoff"
  | "revealNumber"
  | "discussion"
  | "ordering"
  | "confirmOrder"
  | "result";

export type NumberTalkState = {
  phase: NumberTalkPhase;
  config: NumberTalkConfig;
  topic: NumberTalkTopic;
  currentPlayerIndex: number;
  assignments: NumberAssignment[];
  revealedPlayerIds: string[];
  order: string[];
};

export function defaultNumberTalkConfig(): NumberTalkConfig {
  return {
    numberMin: 1,
    numberMax: 100,
    cardsPerPlayer: 1,
    topicCategory: "normal",
    discussionTimeSec: 300
  };
}

export function createNumberTalkState(players: Player[], config: NumberTalkConfig, seed: string): NumberTalkState {
  const numbers = sample(
    Array.from({ length: 100 }, (_, index) => index + 1),
    players.length,
    `${seed}:numbers`
  );
  const topics = getNumberTalkTopicsForCategory(config.topicCategory);
  const topic = getNumberTalkTopicForConfig(config) ?? sample(topics, 1, `${seed}:topic`)[0];
  return {
    phase: "handoff",
    config: { ...config, topicId: topic.id },
    topic,
    currentPlayerIndex: 0,
    assignments: players.map((player, index) => ({ playerId: player.id, number: numbers[index] })),
    revealedPlayerIds: [],
    order: shuffle(
      players.map((player) => player.id),
      `${seed}:initial-order`
    )
  };
}

export function getNumberTalkTopicsForCategory(category: NumberTalkCategory) {
  const topics = numberTalkTopics.filter((topic) => topic.enabled && topic.category === category);
  return topics.length ? topics : numberTalkTopics.filter((topic) => topic.enabled);
}

export function getNumberTalkTopicForConfig(config: Pick<NumberTalkConfig, "topicCategory" | "topicId">) {
  if (!config.topicId) return null;
  return getNumberTalkTopicsForCategory(config.topicCategory).find((topic) => topic.id === config.topicId) ?? null;
}

export function getNumberForPlayer(state: NumberTalkState, playerId: string) {
  return state.assignments.find((assignment) => assignment.playerId === playerId)?.number ?? 1;
}

export function isNumberOrderCorrect(state: NumberTalkState) {
  const values = state.order.map((playerId) => getNumberForPlayer(state, playerId));
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}
