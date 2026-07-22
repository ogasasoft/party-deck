import { DEFAULT_PLAYERS, type ActiveSessionRef, type GameId, type Player } from "../src/core/types";
import { createDrinkingGamesState, defaultDrinkingGamesConfig } from "../src/games/drinkingGames";
import { createFakeArtistState, defaultFakeArtistConfig } from "../src/games/fakeArtist";
import { createInsiderGuessState, defaultInsiderGuessConfig } from "../src/games/insiderGuess";
import { createNumberTalkState, defaultNumberTalkConfig } from "../src/games/numberTalk";
import { createRankingAnswersState, defaultRankingAnswersConfig } from "../src/games/rankingAnswers";
import { createSpyLocationState, defaultSpyLocationConfig } from "../src/games/spyLocation";
import { createSpectrumMeterState, defaultSpectrumMeterConfig } from "../src/games/spectrumMeter";
import { createWerewolfState, defaultWerewolfConfig } from "../src/games/werewolf";
import { createWordInfiltratorState, defaultWordInfiltratorConfig } from "../src/games/wordInfiltrator";
import { MAX_WHEEL_ITEM_CODE_UNITS, MAX_WHEEL_ITEMS } from "../src/tools/randomTools";

const conservativeBudgetBytes = 2 * 1024 * 1024;
const eightPlayers: Player[] = [
  ...DEFAULT_PLAYERS,
  { id: "p5", nickname: "ソラ", color: "#e76f51" },
  { id: "p6", nickname: "ナギ", color: "#4f5d75" },
  { id: "p7", nickname: "リオ", color: "#d64545" },
  { id: "p8", nickname: "メイ", color: "#0f8b8d" }
];

type Entry = {
  key: string;
  value: unknown;
};

function makeSession(gameId: GameId, state: unknown) {
  const ref: ActiveSessionRef = { sessionId: `${gameId}:storage-audit`, gameId };
  return {
    ...ref,
    state,
    createdAt: "2026-06-05T00:00:00.000Z",
    updatedAt: "2026-06-05T00:00:00.000Z"
  };
}

const appState = {
  screen: "home",
  selectedGame: null,
  players: eightPlayers,
  numberConfig: defaultNumberTalkConfig(),
  werewolfConfig: defaultWerewolfConfig(),
  drinkingGamesConfig: defaultDrinkingGamesConfig(),
  wordInfiltratorConfig: defaultWordInfiltratorConfig(),
  insiderGuessConfig: defaultInsiderGuessConfig(),
  spyLocationConfig: defaultSpyLocationConfig(),
  spectrumMeterConfig: defaultSpectrumMeterConfig(),
  rankingAnswersConfig: defaultRankingAnswersConfig(),
  fakeArtistConfig: defaultFakeArtistConfig(),
  activeSession: null
};

const entries: Entry[] = [
  { key: "party:v1:players", value: eightPlayers },
  { key: "party:v1:app-state", value: appState },
  { key: "party:v1:random-wheel-items", value: Array.from({ length: MAX_WHEEL_ITEMS }, () => `a${"́".repeat(MAX_WHEEL_ITEM_CODE_UNITS - 1)}`).join("\n") },
  { key: "number-talk", value: makeSession("number-talk", createNumberTalkState(eightPlayers, defaultNumberTalkConfig(), "storage")) },
  { key: "werewolf", value: makeSession("werewolf", createWerewolfState(eightPlayers, defaultWerewolfConfig(), "storage")) },
  { key: "drinking-games", value: makeSession("drinking-games", createDrinkingGamesState(defaultDrinkingGamesConfig())) },
  { key: "word-infiltrator", value: makeSession("word-infiltrator", createWordInfiltratorState(eightPlayers, defaultWordInfiltratorConfig(), "storage")) },
  { key: "insider-guess", value: makeSession("insider-guess", createInsiderGuessState(eightPlayers, defaultInsiderGuessConfig(), "storage")) },
  { key: "spy-location", value: makeSession("spy-location", createSpyLocationState(eightPlayers, defaultSpyLocationConfig(), "storage")) },
  { key: "spectrum-meter", value: makeSession("spectrum-meter", createSpectrumMeterState(eightPlayers, defaultSpectrumMeterConfig(), "storage")) },
  { key: "ranking-answers", value: makeSession("ranking-answers", createRankingAnswersState(eightPlayers, defaultRankingAnswersConfig(), "storage")) },
  { key: "fake-artist", value: makeSession("fake-artist", createFakeArtistState(eightPlayers, defaultFakeArtistConfig(), "storage")) }
];

const rows = entries.map((entry) => {
  const bytes = Buffer.byteLength(JSON.stringify(entry.value), "utf8");
  return { key: entry.key, bytes };
});
const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
const report = {
  checkedAt: new Date().toISOString(),
  conservativeBudgetBytes,
  totalBytes,
  totalKiB: Number((totalBytes / 1024).toFixed(2)),
  usageRatio: Number((totalBytes / conservativeBudgetBytes).toFixed(4)),
  rows
};

console.log(JSON.stringify(report, null, 2));

if (totalBytes > conservativeBudgetBytes) {
  console.error(`localStorage audit failed: ${totalBytes} bytes exceeds ${conservativeBudgetBytes} bytes`);
  process.exitCode = 1;
}
