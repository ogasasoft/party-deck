import { createGeoState, defaultGeoConfig, type GeoConfig, type GeoState } from "../games/geoGuessr";
import { loadPlayableGeoLocations } from "../games/geoLocationRepository";
import { createNumberTalkState, defaultNumberTalkConfig, type NumberTalkConfig, type NumberTalkState } from "../games/numberTalk";
import { createWerewolfState, defaultWerewolfConfig, type WerewolfConfig, type WerewolfState } from "../games/werewolf";
import type { GameDefinition, GameId, GameSummary } from "./types";

export type GameDefinitionMap = {
  geo: GameDefinition<GeoConfig, GeoState>;
  "number-talk": GameDefinition<NumberTalkConfig, NumberTalkState>;
  werewolf: GameDefinition<WerewolfConfig, WerewolfState>;
};

export const gameDefinitions: GameDefinitionMap = {
  geo: {
    id: "geo",
    title: "日本マップGuessr",
    description: "Mapillaryの日本画像を見て、全員が同じ地点を順番に当てます。",
    minPlayers: 2,
    maxPlayers: 8,
    defaultConfig: defaultGeoConfig,
    createState: async ({ players, config, seed }) => {
      const locations = await loadPlayableGeoLocations();
      return createGeoState(players, config, seed, locations);
    }
  },
  "number-talk": {
    id: "number-talk",
    title: "ナンバートーク",
    description: "1から100の数字を直接言わず、お題への価値観で順番を推理します。",
    minPlayers: 2,
    maxPlayers: 8,
    defaultConfig: defaultNumberTalkConfig,
    createState: ({ players, config, seed }) => createNumberTalkState(players, config, seed)
  },
  werewolf: {
    id: "werewolf",
    title: "ワンナイト人狼",
    description: "村人、人狼、占い師、怪盗で夜行動、議論、投票を1ゲームで遊びます。",
    minPlayers: 3,
    maxPlayers: 8,
    defaultConfig: defaultWerewolfConfig,
    createState: ({ players, config, seed }) => createWerewolfState(players, config, seed)
  }
};

export const games: GameSummary[] = Object.values(gameDefinitions).map(({ id, title, description, minPlayers, maxPlayers }) => ({
  id,
  title,
  description,
  minPlayers,
  maxPlayers
}));

export function getGameDefinition<TGameId extends GameId>(gameId: TGameId): GameDefinitionMap[TGameId] {
  return gameDefinitions[gameId];
}
