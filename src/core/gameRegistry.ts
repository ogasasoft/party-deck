import { createGeoState, defaultGeoConfig, type GeoConfig, type GeoState } from "../games/geoGuessr";
import { loadPlayableGeoLocations } from "../games/geoLocationRepository";
import { createDrinkingGamesState, defaultDrinkingGamesConfig, type DrinkingGamesConfig, type DrinkingGamesState } from "../games/drinkingGames";
import { createFakeArtistState, defaultFakeArtistConfig, type FakeArtistConfig, type FakeArtistState } from "../games/fakeArtist";
import { createInsiderGuessState, defaultInsiderGuessConfig, type InsiderGuessConfig, type InsiderGuessState } from "../games/insiderGuess";
import { createNumberTalkState, defaultNumberTalkConfig, type NumberTalkConfig, type NumberTalkState } from "../games/numberTalk";
import { createRankingAnswersState, defaultRankingAnswersConfig, type RankingAnswersConfig, type RankingAnswersState } from "../games/rankingAnswers";
import { createSpyLocationState, defaultSpyLocationConfig, type SpyLocationConfig, type SpyLocationState } from "../games/spyLocation";
import { createSpectrumMeterState, defaultSpectrumMeterConfig, type SpectrumMeterConfig, type SpectrumMeterState } from "../games/spectrumMeter";
import { createWerewolfState, defaultWerewolfConfig, type WerewolfConfig, type WerewolfState } from "../games/werewolf";
import { createWordInfiltratorState, defaultWordInfiltratorConfig, type WordInfiltratorConfig, type WordInfiltratorState } from "../games/wordInfiltrator";
import type { GameDefinition, GameId, GameSummary } from "./types";

export type GameDefinitionMap = {
  geo: GameDefinition<GeoConfig, GeoState>;
  "number-talk": GameDefinition<NumberTalkConfig, NumberTalkState>;
  werewolf: GameDefinition<WerewolfConfig, WerewolfState>;
  "drinking-games": GameDefinition<DrinkingGamesConfig, DrinkingGamesState>;
  "word-infiltrator": GameDefinition<WordInfiltratorConfig, WordInfiltratorState>;
  "insider-guess": GameDefinition<InsiderGuessConfig, InsiderGuessState>;
  "spy-location": GameDefinition<SpyLocationConfig, SpyLocationState>;
  "spectrum-meter": GameDefinition<SpectrumMeterConfig, SpectrumMeterState>;
  "ranking-answers": GameDefinition<RankingAnswersConfig, RankingAnswersState>;
  "fake-artist": GameDefinition<FakeArtistConfig, FakeArtistState>;
};

export const gameDefinitions: GameDefinitionMap = {
  geo: {
    id: "geo",
    title: "日本マップ当て",
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
  },
  "drinking-games": {
    id: "drinking-games",
    title: "飲み会ゲーム辞典",
    description: "道具なしで遊べる飲み会ゲームを検索し、ルールだけ確認できます。",
    minPlayers: 1,
    maxPlayers: 8,
    defaultConfig: defaultDrinkingGamesConfig,
    createState: ({ config }) => createDrinkingGamesState(config)
  },
  "word-infiltrator": {
    id: "word-infiltrator",
    title: "ワード潜入者",
    description: "1人だけ秘密の言葉を知らない中、ヒントと投票で潜入者を探します。",
    minPlayers: 3,
    maxPlayers: 8,
    defaultConfig: defaultWordInfiltratorConfig,
    createState: ({ players, config, seed }) => createWordInfiltratorState(players, config, seed)
  },
  "insider-guess": {
    id: "insider-guess",
    title: "インサイダー推理",
    description: "答えを知る進行役と内通者をまぎれ込ませ、質問と投票で見抜きます。",
    minPlayers: 4,
    maxPlayers: 8,
    defaultConfig: defaultInsiderGuessConfig,
    createState: ({ players, config, seed }) => createInsiderGuessState(players, config, seed)
  },
  "spy-location": {
    id: "spy-location",
    title: "スパイロケーション",
    description: "1人だけ場所を知らないスパイを、質問と告発で見抜きます。",
    minPlayers: 4,
    maxPlayers: 8,
    defaultConfig: defaultSpyLocationConfig,
    createState: ({ players, config, seed }) => createSpyLocationState(players, config, seed)
  },
  "spectrum-meter": {
    id: "spectrum-meter",
    title: "価値観メーター",
    description: "親だけが見た正解位置を、ヒントからみんなでスライダー推理します。",
    minPlayers: 2,
    maxPlayers: 8,
    defaultConfig: defaultSpectrumMeterConfig,
    createState: ({ players, config, seed }) => createSpectrumMeterState(players, config, seed)
  },
  "ranking-answers": {
    id: "ranking-answers",
    title: "ランキング回答",
    description: "1-10の秘密番号に合わせた回答を、キャプテンが小さい順に並べます。",
    minPlayers: 4,
    maxPlayers: 8,
    defaultConfig: defaultRankingAnswersConfig,
    createState: ({ players, config, seed }) => createRankingAnswersState(players, config, seed)
  },
  "fake-artist": {
    id: "fake-artist",
    title: "エセアーティスト",
    description: "出題者以外で線を描き、1人だけお題を知らない偽物を探します。",
    minPlayers: 5,
    maxPlayers: 8,
    defaultConfig: defaultFakeArtistConfig,
    createState: ({ players, config, seed }) => createFakeArtistState(players, config, seed)
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
