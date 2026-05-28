export type GameId =
  | "geo"
  | "number-talk"
  | "werewolf"
  | "drinking-games"
  | "word-infiltrator"
  | "insider-guess"
  | "spy-location"
  | "spectrum-meter"
  | "ranking-answers"
  | "fake-artist";

export type Player = {
  id: string;
  nickname: string;
  color: string;
};

export type GameSummary = {
  id: GameId;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
};

export type GameDefinition<TConfig = unknown, TState = unknown> = GameSummary & {
  defaultConfig: () => TConfig;
  createState: (params: { players: Player[]; config: TConfig; seed: string }) => TState | Promise<TState>;
};

export type ActiveSessionRef = {
  sessionId: string;
  gameId: GameId;
};

export type AdContext =
  | "home"
  | "playerSetup"
  | "gameSetup"
  | "result"
  | "handoff"
  | "secret"
  | "answering"
  | "voting";

export const PLAYER_COLORS = [
  "#d64545",
  "#0f8b8d",
  "#f0b429",
  "#2e67b1",
  "#2d7d46",
  "#7c4dff",
  "#e76f51",
  "#4f5d75"
];

export const DEFAULT_PLAYERS: Player[] = [
  { id: "p1", nickname: "アオイ", color: PLAYER_COLORS[0] },
  { id: "p2", nickname: "ミナト", color: PLAYER_COLORS[1] },
  { id: "p3", nickname: "ユイ", color: PLAYER_COLORS[2] },
  { id: "p4", nickname: "レン", color: PLAYER_COLORS[3] }
];
