import type * as React from "react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CountdownTimer } from "./components/CountdownTimer";
import { PlayerSetup } from "./components/PlayerSetup";
import { AdSlot, FinalResultActions, PassDevice, PlayerOrder, PlayerStrip, Topbar } from "./components/PartyScreens";
import { games, getGameDefinition, isGameAvailable } from "./core/gameRegistry";
import { createSeed } from "./core/random";
import { sanitizeReloadPhase } from "./core/reloadSafety";
import {
  clearAppState,
  clearGameSession,
  createSessionId,
  loadAppState,
  loadGameSession,
  loadPlayers,
  saveAppState,
  saveGameSession,
  savePlayers
} from "./core/storage";
import { ActiveSessionRef, GameId, GameSummary, Player } from "./core/types";
import {
  defaultDrinkingGamesConfig,
  drinkingGameCountries,
  drinkingGameSpecialCategories,
  filterDrinkingGames,
  type DrinkingGamesConfig,
  type DrinkingGamesState
} from "./games/drinkingGames";
import {
  defaultNumberTalkConfig,
  getNumberTalkTopicForConfig,
  getNumberTalkTopicsForCategory,
  getNumberForPlayer,
  isNumberOrderCorrect,
  NumberTalkCategory,
  NumberTalkConfig,
  NumberTalkState
} from "./games/numberTalk";
import { roleDefinitions } from "./data/werewolfRoles";
import {
  applyRobberAction,
  applySeerAction,
  countRoleCards,
  defaultRoleCounts,
  defaultWerewolfConfig,
  judgeWerewolf,
  normalizeWerewolfConfig,
  recordWerewolfAction,
  resolveWerewolfNightActions,
  WEREWOLF_ROLE_IDS,
  type RoleCounts,
  type RoleId,
  type WerewolfNightAction,
  WerewolfConfig,
  WerewolfState,
  WerewolfVote
} from "./games/werewolf";
import { WordInfiltratorCategory, wordInfiltratorTopics } from "./data/wordInfiltratorTopics";
import {
  defaultWordInfiltratorConfig,
  type WordInfiltratorConfig,
  type WordInfiltratorState
} from "./games/wordInfiltrator";
import { InsiderAnswerCategory, insiderAnswers } from "./data/insiderAnswers";
import {
  defaultInsiderGuessConfig,
  type InsiderGuessConfig,
  type InsiderGuessState
} from "./games/insiderGuess";
import { SpyLocationCategory, spyLocations } from "./data/spyLocations";
import {
  defaultSpyLocationConfig,
  type SpyLocationConfig,
  type SpyLocationState
} from "./games/spyLocation";
import { SpectrumScaleCategory, spectrumScales } from "./data/spectrumScales";
import {
  defaultSpectrumMeterConfig,
  normalizeSpectrumMeterConfig,
  type SpectrumMeterConfig,
  type SpectrumMeterState
} from "./games/spectrumMeter";
import { RankingAnswerCategory, rankingAnswerPrompts } from "./data/rankingAnswerPrompts";
import {
  defaultRankingAnswersConfig,
  type RankingAnswersConfig,
  type RankingAnswersState
} from "./games/rankingAnswers";
import { FakeArtistCategory, fakeArtistTopics } from "./data/fakeArtistTopics";
import {
  defaultFakeArtistConfig,
  type FakeArtistConfig,
  type FakeArtistState
} from "./games/fakeArtist";
import { MajorityMatchCategory, majorityMatchPrompts } from "./data/majorityMatchPrompts";
import {
  defaultMajorityMatchConfig,
  type MajorityMatchConfig,
  type MajorityMatchState
} from "./games/majorityMatch";
import { OneWordClueCategory, oneWordClueWords } from "./data/oneWordClueWords";
import {
  defaultOneWordClueConfig,
  type OneWordClueConfig,
  type OneWordClueState
} from "./games/oneWordClue";

type Screen = "home" | "players" | "setup" | "game" | "bill-split" | "random-tools";

const AddedTableGameScreens = lazy(() => import("./features/AddedTableGames"));
const QuickPartyGameScreens = lazy(() => import("./features/QuickPartyGames"));
const BillSplit = lazy(() => import("./features/BillSplit"));
const RandomTools = lazy(() => import("./features/RandomTools"));
const addedTableGameIds = ["word-infiltrator", "insider-guess", "spy-location", "spectrum-meter", "ranking-answers", "fake-artist"] as const satisfies readonly GameId[];
const quickPartyGameIds = ["majority-match", "one-word-clue"] as const satisfies readonly GameId[];

const wordInfiltratorCategoryOptions = [...new Set(wordInfiltratorTopics.map((topic) => topic.category))];
const wordInfiltratorCategoryLabels: Record<"all" | WordInfiltratorCategory, string> = {
  all: "すべて",
  food: "食べ物",
  place: "場所",
  daily: "日用品",
  culture: "エンタメ",
  nature: "自然",
  action: "行動"
};
const insiderAnswerCategoryOptions = [...new Set(insiderAnswers.map((answer) => answer.category))];
const insiderAnswerCategoryLabels: Record<"all" | InsiderAnswerCategory, string> = {
  all: "すべて",
  object: "もの",
  food: "食べ物",
  place: "場所",
  daily: "暮らし",
  culture: "文化",
  nature: "自然"
};
const spyLocationCategoryOptions = [...new Set(spyLocations.map((location) => location.category))];
const spyLocationCategoryLabels: Record<"all" | SpyLocationCategory, string> = {
  all: "すべて",
  travel: "移動",
  daily: "日常",
  work: "仕事",
  leisure: "遊び",
  nature: "自然",
  event: "イベント"
};
const spectrumScaleCategoryOptions = [...new Set(spectrumScales.map((scale) => scale.category))];
const spectrumScaleCategoryLabels: Record<"all" | SpectrumScaleCategory, string> = {
  all: "すべて",
  taste: "好み",
  life: "暮らし",
  personality: "性格",
  culture: "カルチャー",
  silly: "変化球"
};
const rankingAnswerCategoryOptions = [...new Set(rankingAnswerPrompts.map((prompt) => prompt.category))];
const rankingAnswerCategoryLabels: Record<"all" | RankingAnswerCategory, string> = {
  all: "すべて",
  daily: "日常",
  party: "パーティ",
  acting: "演技",
  taste: "好み",
  silly: "変化球"
};
const fakeArtistCategoryOptions = [...new Set(fakeArtistTopics.map((topic) => topic.category))];
const fakeArtistCategoryLabels: Record<"all" | FakeArtistCategory, string> = {
  all: "すべて",
  food: "食べ物",
  place: "場所",
  animal: "生き物",
  object: "もの",
  event: "できごと"
};
const majorityMatchCategoryOptions = [...new Set(majorityMatchPrompts.map((prompt) => prompt.category))];
const majorityMatchCategoryLabels: Record<"all" | MajorityMatchCategory, string> = {
  all: "すべて",
  daily: "日常",
  food: "食べ物",
  party: "パーティ",
  imagination: "想像"
};
const oneWordClueCategoryOptions = [...new Set(oneWordClueWords.map((word) => word.category))];
const oneWordClueCategoryLabels: Record<"all" | OneWordClueCategory, string> = {
  all: "すべて",
  daily: "日常",
  food: "食べ物",
  nature: "自然",
  culture: "カルチャー"
};

function pickNumberTalkTopicId(category: NumberTalkCategory, currentTopicId?: string) {
  const topics = getNumberTalkTopicsForCategory(category);
  const candidates = topics.filter((topic) => topic.id !== currentTopicId);
  const pool = candidates.length ? candidates : topics;
  return pool[Math.floor(Math.random() * pool.length)]?.id;
}

function withNextNumberTalkTopic(config: NumberTalkConfig, category = config.topicCategory): NumberTalkConfig {
  return {
    ...config,
    topicCategory: category,
    topicId: pickNumberTalkTopicId(category, category === config.topicCategory ? config.topicId : undefined)
  };
}

function withValidNumberTalkTopic(config: NumberTalkConfig): NumberTalkConfig {
  if (getNumberTalkTopicForConfig(config)) return config;
  return withNextNumberTalkTopic(config);
}

function sameRoleCounts(left: RoleCounts, right: RoleCounts) {
  return WEREWOLF_ROLE_IDS.every((roleId) => left[roleId] === right[roleId]);
}

type PersistedAppState = {
  screen: Screen;
  selectedGame: GameId | null;
  players: Player[];
  numberConfig: NumberTalkConfig;
  werewolfConfig: WerewolfConfig;
  drinkingGamesConfig: DrinkingGamesConfig;
  wordInfiltratorConfig: WordInfiltratorConfig;
  insiderGuessConfig: InsiderGuessConfig;
  spyLocationConfig: SpyLocationConfig;
  spectrumMeterConfig: SpectrumMeterConfig;
  rankingAnswersConfig: RankingAnswersConfig;
  fakeArtistConfig: FakeArtistConfig;
  majorityMatchConfig: MajorityMatchConfig;
  oneWordClueConfig: OneWordClueConfig;
  activeSession: ActiveSessionRef | null;
};

type RestoredAppState = PersistedAppState & {
  numberState: NumberTalkState | null;
  werewolfState: WerewolfState | null;
  drinkingGamesState: DrinkingGamesState | null;
  wordInfiltratorState: WordInfiltratorState | null;
  insiderGuessState: InsiderGuessState | null;
  spyLocationState: SpyLocationState | null;
  spectrumMeterState: SpectrumMeterState | null;
  rankingAnswersState: RankingAnswersState | null;
  fakeArtistState: FakeArtistState | null;
  majorityMatchState: MajorityMatchState | null;
  oneWordClueState: OneWordClueState | null;
};

export function App() {
  const restored = useMemo(() => restorePersistedAppState(), []);
  const [screen, setScreen] = useState<Screen>(restored?.screen ?? "home");
  const [selectedGame, setSelectedGame] = useState<GameId | null>(restored?.selectedGame ?? null);
  const [players, setPlayers] = useState<Player[]>(() => restored?.players ?? loadPlayers());
  const [numberConfig, setNumberConfig] = useState<NumberTalkConfig>(() => restored?.numberConfig ?? defaultNumberTalkConfig());
  const [werewolfConfig, setWerewolfConfig] = useState<WerewolfConfig>(() => normalizeWerewolfConfig(restored?.werewolfConfig ?? defaultWerewolfConfig(), players.length));
  const [drinkingGamesConfig] = useState<DrinkingGamesConfig>(() => restored?.drinkingGamesConfig ?? defaultDrinkingGamesConfig());
  const [wordInfiltratorConfig, setWordInfiltratorConfig] = useState<WordInfiltratorConfig>(() => restored?.wordInfiltratorConfig ?? defaultWordInfiltratorConfig());
  const [insiderGuessConfig, setInsiderGuessConfig] = useState<InsiderGuessConfig>(() => restored?.insiderGuessConfig ?? defaultInsiderGuessConfig());
  const [spyLocationConfig, setSpyLocationConfig] = useState<SpyLocationConfig>(() => restored?.spyLocationConfig ?? defaultSpyLocationConfig());
  const [spectrumMeterConfig, setSpectrumMeterConfig] = useState<SpectrumMeterConfig>(() => normalizeSpectrumMeterConfig(restored?.spectrumMeterConfig ?? defaultSpectrumMeterConfig()));
  const [rankingAnswersConfig, setRankingAnswersConfig] = useState<RankingAnswersConfig>(() => restored?.rankingAnswersConfig ?? defaultRankingAnswersConfig());
  const [fakeArtistConfig, setFakeArtistConfig] = useState<FakeArtistConfig>(() => restored?.fakeArtistConfig ?? defaultFakeArtistConfig());
  const [majorityMatchConfig, setMajorityMatchConfig] = useState<MajorityMatchConfig>(() => restored?.majorityMatchConfig ?? defaultMajorityMatchConfig());
  const [oneWordClueConfig, setOneWordClueConfig] = useState<OneWordClueConfig>(() => restored?.oneWordClueConfig ?? defaultOneWordClueConfig());
  const [numberState, setNumberState] = useState<NumberTalkState | null>(restored?.numberState ?? null);
  const [werewolfState, setWerewolfState] = useState<WerewolfState | null>(restored?.werewolfState ?? null);
  const [drinkingGamesState, setDrinkingGamesState] = useState<DrinkingGamesState | null>(restored?.drinkingGamesState ?? null);
  const [wordInfiltratorState, setWordInfiltratorState] = useState<WordInfiltratorState | null>(restored?.wordInfiltratorState ?? null);
  const [insiderGuessState, setInsiderGuessState] = useState<InsiderGuessState | null>(restored?.insiderGuessState ?? null);
  const [spyLocationState, setSpyLocationState] = useState<SpyLocationState | null>(restored?.spyLocationState ?? null);
  const [spectrumMeterState, setSpectrumMeterState] = useState<SpectrumMeterState | null>(restored?.spectrumMeterState ?? null);
  const [rankingAnswersState, setRankingAnswersState] = useState<RankingAnswersState | null>(restored?.rankingAnswersState ?? null);
  const [fakeArtistState, setFakeArtistState] = useState<FakeArtistState | null>(restored?.fakeArtistState ?? null);
  const [majorityMatchState, setMajorityMatchState] = useState<MajorityMatchState | null>(restored?.majorityMatchState ?? null);
  const [oneWordClueState, setOneWordClueState] = useState<OneWordClueState | null>(restored?.oneWordClueState ?? null);
  const [activeSession, setActiveSession] = useState<ActiveSessionRef | null>(restored?.activeSession ?? null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (screen !== "setup") return;
    if (selectedGame === "number-talk") {
      setNumberConfig((config) => withValidNumberTalkTopic(config));
    }
    if (selectedGame === "werewolf") {
      setWerewolfConfig((config) => {
        const normalized = normalizeWerewolfConfig(config, players.length);
        return sameRoleCounts(config.roleCounts, normalized.roleCounts) && config.discussionTimeSec === normalized.discussionTimeSec ? config : normalized;
      });
    }
  }, [players.length, screen, selectedGame]);

  useEffect(() => savePlayers(players), [players]);
  useEffect(() => {
    const gameState = activeSession
      ? getActiveGameState(activeSession.gameId, {
          numberState,
          werewolfState,
          drinkingGamesState,
          wordInfiltratorState,
          insiderGuessState,
          spyLocationState,
          spectrumMeterState,
          rankingAnswersState,
          fakeArtistState,
          majorityMatchState,
          oneWordClueState
        })
      : null;
    if (activeSession && gameState) {
      const previous = loadGameSession<typeof gameState>(activeSession.sessionId, activeSession.gameId);
      const now = new Date().toISOString();
      saveGameSession({
        ...activeSession,
        state: gameState,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now
      });
    }
    saveAppState({
      screen,
      selectedGame,
      players,
      numberConfig,
      werewolfConfig,
      drinkingGamesConfig,
      wordInfiltratorConfig,
      insiderGuessConfig,
      spyLocationConfig,
      spectrumMeterConfig,
      rankingAnswersConfig,
      fakeArtistConfig,
      majorityMatchConfig,
      oneWordClueConfig,
      activeSession
    } satisfies PersistedAppState);
  }, [
    screen,
    selectedGame,
    players,
    numberConfig,
    werewolfConfig,
    drinkingGamesConfig,
    wordInfiltratorConfig,
    insiderGuessConfig,
    spyLocationConfig,
    spectrumMeterConfig,
    rankingAnswersConfig,
    fakeArtistConfig,
    majorityMatchConfig,
    oneWordClueConfig,
    numberState,
    werewolfState,
    drinkingGamesState,
    wordInfiltratorState,
    insiderGuessState,
    spyLocationState,
    spectrumMeterState,
    rankingAnswersState,
    fakeArtistState,
    majorityMatchState,
    oneWordClueState,
    activeSession
  ]);

  const selectedSummary = selectedGame ? getGameDefinition(selectedGame) : null;

  function navigateHome() {
    clearGameSession(activeSession);
    setActiveSession(null);
    setNumberState(null);
    setWerewolfState(null);
    setDrinkingGamesState(null);
    setWordInfiltratorState(null);
    setInsiderGuessState(null);
    setSpyLocationState(null);
    setSpectrumMeterState(null);
    setRankingAnswersState(null);
    setFakeArtistState(null);
    setMajorityMatchState(null);
    setOneWordClueState(null);
    setScreen("home");
    setSelectedGame(null);
    clearAppState();
  }

  function openSetup(gameId: GameId) {
    if (!isGameAvailable(gameId)) return;
    clearGameSession(activeSession);
    setActiveSession(null);
    setNumberState(null);
    setWerewolfState(null);
    setDrinkingGamesState(null);
    setWordInfiltratorState(null);
    setInsiderGuessState(null);
    setSpyLocationState(null);
    setSpectrumMeterState(null);
    setRankingAnswersState(null);
    setFakeArtistState(null);
    setMajorityMatchState(null);
    setOneWordClueState(null);
    if (gameId === "number-talk") {
      setNumberConfig((config) => withValidNumberTalkTopic(config));
    }
    if (gameId === "werewolf") {
      setWerewolfConfig((config) => {
        const normalized = normalizeWerewolfConfig(config, players.length);
        return sameRoleCounts(config.roleCounts, normalized.roleCounts) && config.discussionTimeSec === normalized.discussionTimeSec ? config : normalized;
      });
    }
    setSelectedGame(gameId);
    setScreen("setup");
  }

  async function startGame() {
    if (isStarting || !selectedGame || !isGameAvailable(selectedGame)) return;
    setIsStarting(true);
    const seed = createSeed();
    try {
      const nextSession = { sessionId: createSessionId(selectedGame), gameId: selectedGame };
      setMajorityMatchState(null);
      setOneWordClueState(null);
      if (selectedGame === "number-talk") {
        const config = withValidNumberTalkTopic(numberConfig);
        setNumberConfig(config);
        const state = await getGameDefinition("number-talk").createState({ players, config, seed });
        setNumberState(state);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "werewolf") {
        const config = normalizeWerewolfConfig(werewolfConfig, players.length);
        setWerewolfConfig(config);
        const state = await getGameDefinition("werewolf").createState({ players, config, seed });
        setWerewolfState(state);
        setNumberState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "drinking-games") {
        const state = await getGameDefinition("drinking-games").createState({ players, config: drinkingGamesConfig, seed });
        setDrinkingGamesState(state);
        setNumberState(null);
        setWerewolfState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "word-infiltrator") {
        const state = await getGameDefinition("word-infiltrator").createState({ players, config: wordInfiltratorConfig, seed });
        setWordInfiltratorState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "insider-guess") {
        const state = await getGameDefinition("insider-guess").createState({ players, config: insiderGuessConfig, seed });
        setInsiderGuessState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "spy-location") {
        const state = await getGameDefinition("spy-location").createState({ players, config: spyLocationConfig, seed });
        setSpyLocationState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "spectrum-meter") {
        const state = await getGameDefinition("spectrum-meter").createState({ players, config: spectrumMeterConfig, seed });
        setSpectrumMeterState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "ranking-answers") {
        const state = await getGameDefinition("ranking-answers").createState({ players, config: rankingAnswersConfig, seed });
        setRankingAnswersState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "fake-artist") {
        const state = await getGameDefinition("fake-artist").createState({ players, config: fakeArtistConfig, seed });
        setFakeArtistState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
      }
      if (selectedGame === "majority-match") {
        const state = await getGameDefinition("majority-match").createState({ players, config: majorityMatchConfig, seed });
        setMajorityMatchState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      if (selectedGame === "one-word-clue") {
        const state = await getGameDefinition("one-word-clue").createState({ players, config: oneWordClueConfig, seed });
        setOneWordClueState(state);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
        setFakeArtistState(null);
      }
      setActiveSession(nextSession);
      setScreen("game");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main className="app-shell">
      {screen === "home" && <HomeScreen onPlayers={() => setScreen("players")} onSelect={openSetup} onBillSplit={() => setScreen("bill-split")} onRandomTools={() => setScreen("random-tools")} />}
      {screen === "players" && <PlayerSetup players={players} setPlayers={setPlayers} onBack={navigateHome} />}
      {screen === "bill-split" && (
        <Suspense
          fallback={
            <section className="screen">
              <Topbar title="読み込み中" />
              <div className="content"><div className="notice">割り勘ツールを読み込んでいます。</div></div>
            </section>
          }
        >
          <BillSplit players={players} onHome={navigateHome} />
        </Suspense>
      )}
      {screen === "random-tools" && (
        <Suspense
          fallback={
            <section className="screen">
              <Topbar title="読み込み中" />
              <div className="content"><div className="notice">ランダムツールを読み込んでいます。</div></div>
            </section>
          }
        >
          <RandomTools players={players} onHome={navigateHome} />
        </Suspense>
      )}
      {screen === "setup" && selectedSummary && (
        <SetupScreen
          game={selectedSummary}
          players={players}
          numberConfig={numberConfig}
          setNumberConfig={setNumberConfig}
          werewolfConfig={werewolfConfig}
          setWerewolfConfig={setWerewolfConfig}
          wordInfiltratorConfig={wordInfiltratorConfig}
          setWordInfiltratorConfig={setWordInfiltratorConfig}
          insiderGuessConfig={insiderGuessConfig}
          setInsiderGuessConfig={setInsiderGuessConfig}
          spyLocationConfig={spyLocationConfig}
          setSpyLocationConfig={setSpyLocationConfig}
          spectrumMeterConfig={spectrumMeterConfig}
          setSpectrumMeterConfig={setSpectrumMeterConfig}
          rankingAnswersConfig={rankingAnswersConfig}
          setRankingAnswersConfig={setRankingAnswersConfig}
          fakeArtistConfig={fakeArtistConfig}
          setFakeArtistConfig={setFakeArtistConfig}
          majorityMatchConfig={majorityMatchConfig}
          setMajorityMatchConfig={setMajorityMatchConfig}
          oneWordClueConfig={oneWordClueConfig}
          setOneWordClueConfig={setOneWordClueConfig}
          onBack={navigateHome}
          onStart={startGame}
          isStarting={isStarting}
        />
      )}
      {screen === "game" && selectedGame === "number-talk" && numberState && (
        <NumberTalkGame state={numberState} setState={setNumberState} players={players} onHome={navigateHome} onRestart={startGame} />
      )}
      {screen === "game" && selectedGame === "werewolf" && werewolfState && (
        <WerewolfGame state={werewolfState} setState={setWerewolfState} players={players} onHome={navigateHome} onRestart={startGame} />
      )}
      {screen === "game" && selectedGame === "drinking-games" && drinkingGamesState && (
        <DrinkingGamesBrowser state={drinkingGamesState} setState={setDrinkingGamesState} onHome={navigateHome} />
      )}
      {screen === "game" && selectedGame && isAddedTableGame(selectedGame) && (
        <Suspense
          fallback={
            <section className="screen">
              <Topbar title="読み込み中" />
              <div className="content">
                <div className="notice">ゲームを読み込んでいます。</div>
              </div>
            </section>
          }
        >
          <AddedTableGameScreens
            selectedGame={selectedGame}
            players={players}
            onHome={navigateHome}
            onRestart={startGame}
            wordInfiltratorState={wordInfiltratorState}
            setWordInfiltratorState={setWordInfiltratorState}
            insiderGuessState={insiderGuessState}
            setInsiderGuessState={setInsiderGuessState}
            spyLocationState={spyLocationState}
            setSpyLocationState={setSpyLocationState}
            spectrumMeterState={spectrumMeterState}
            setSpectrumMeterState={setSpectrumMeterState}
            rankingAnswersState={rankingAnswersState}
            setRankingAnswersState={setRankingAnswersState}
            fakeArtistState={fakeArtistState}
            setFakeArtistState={setFakeArtistState}
          />
        </Suspense>
      )}
      {screen === "game" && selectedGame && isQuickPartyGame(selectedGame) && (
        <Suspense
          fallback={
            <section className="screen">
              <Topbar title="読み込み中" />
              <div className="content">
                <div className="notice">ゲームを読み込んでいます。</div>
              </div>
            </section>
          }
        >
          <QuickPartyGameScreens
            selectedGame={selectedGame}
            players={players}
            onHome={navigateHome}
            onRestart={startGame}
            majorityMatchState={majorityMatchState}
            setMajorityMatchState={setMajorityMatchState}
            oneWordClueState={oneWordClueState}
            setOneWordClueState={setOneWordClueState}
          />
        </Suspense>
      )}
    </main>
  );
}

function isAddedTableGame(gameId: GameId): gameId is (typeof addedTableGameIds)[number] {
  return addedTableGameIds.includes(gameId as (typeof addedTableGameIds)[number]);
}

function isQuickPartyGame(gameId: GameId): gameId is (typeof quickPartyGameIds)[number] {
  return quickPartyGameIds.includes(gameId as (typeof quickPartyGameIds)[number]);
}

function HomeScreen(props: { onPlayers: () => void; onSelect: (gameId: GameId) => void; onBillSplit: () => void; onRandomTools: () => void }) {
  return (
    <section className="screen">
      <Topbar
        title="ゲームを選ぶ"
        right={
          <button className="text-button" type="button" onClick={props.onPlayers}>
            プレイヤー
          </button>
        }
      />
      <div className="content">
        <div className="game-grid">
          {games.map((game) => (
            <button
              key={game.id}
              className={game.availability === "paused" ? "game-card paused-game-card" : "game-card"}
              type="button"
              onClick={() => props.onSelect(game.id)}
              disabled={game.availability === "paused"}
            >
              <span className="game-card-title-row">
                <span className="game-title">{game.title}</span>
                {game.availabilityLabel && <span className="paused-label">{game.availabilityLabel}</span>}
              </span>
              <span className="pill">
                {game.minPlayers}-{game.maxPlayers}人
              </span>
              <span className="game-description">{game.description}</span>
            </button>
          ))}
        </div>
        <section className="utility-section" aria-labelledby="utility-heading">
          <div className="section-heading">
            <div>
              <span className="field-label">便利ツール</span>
              <h2 id="utility-heading">飲み会の最後まで</h2>
            </div>
          </div>
          <button className="game-card utility-card" type="button" onClick={props.onBillSplit}>
            <span className="game-card-title-row"><span className="game-title">今日の割り勘</span><span className="pill">2-8人</span></span>
            <span className="game-description">お店ごとに割合を決めて、一日の合計をコピーできます。</span>
          </button>
          <button className="game-card utility-card random-utility-card" type="button" onClick={props.onRandomTools}>
            <span className="game-card-title-row"><span className="game-title">ランダムツール</span><span className="pill">3種類</span></span>
            <span className="game-description">ルーレット、コイン、サイコロをすぐ使えます。</span>
          </button>
        </section>
        <AdSlot context="home" />
        <nav className="legal-links" aria-label="サイト情報">
          <a href="/privacy.html">プライバシー</a>
          <a href="/terms.html">利用規約</a>
        </nav>
      </div>
    </section>
  );
}

function SetupScreen(props: {
  game: GameSummary;
  players: Player[];
  numberConfig: NumberTalkConfig;
  setNumberConfig: (config: NumberTalkConfig) => void;
  werewolfConfig: WerewolfConfig;
  setWerewolfConfig: (config: WerewolfConfig) => void;
  wordInfiltratorConfig: WordInfiltratorConfig;
  setWordInfiltratorConfig: (config: WordInfiltratorConfig) => void;
  insiderGuessConfig: InsiderGuessConfig;
  setInsiderGuessConfig: (config: InsiderGuessConfig) => void;
  spyLocationConfig: SpyLocationConfig;
  setSpyLocationConfig: (config: SpyLocationConfig) => void;
  spectrumMeterConfig: SpectrumMeterConfig;
  setSpectrumMeterConfig: (config: SpectrumMeterConfig) => void;
  rankingAnswersConfig: RankingAnswersConfig;
  setRankingAnswersConfig: (config: RankingAnswersConfig) => void;
  fakeArtistConfig: FakeArtistConfig;
  setFakeArtistConfig: (config: FakeArtistConfig) => void;
  majorityMatchConfig: MajorityMatchConfig;
  setMajorityMatchConfig: (config: MajorityMatchConfig) => void;
  oneWordClueConfig: OneWordClueConfig;
  setOneWordClueConfig: (config: OneWordClueConfig) => void;
  onBack: () => void;
  onStart: () => void;
  isStarting: boolean;
}) {
  const roleTargetCards = props.players.length + 2;
  const werewolfConfig = normalizeWerewolfConfig(props.werewolfConfig, props.players.length);
  const roleTotalCards = countRoleCards(werewolfConfig.roleCounts);
  const numberTopicPreview = getNumberTalkTopicForConfig(props.numberConfig) ?? getNumberTalkTopicsForCategory(props.numberConfig.topicCategory)[0];
  const hasValidPlayerCount = props.players.length >= props.game.minPlayers && props.players.length <= props.game.maxPlayers;
  const hasValidRoleCount = props.game.id !== "werewolf" || roleTotalCards === roleTargetCards;
  const canStart = hasValidPlayerCount && hasValidRoleCount;

  return (
    <section className="screen">
      <Topbar title={props.game.title} eyebrow="Game Setup" onBack={props.onBack} />
      <div className="content">
        <PlayerStrip players={props.players} />
        {!hasValidPlayerCount && <div className="notice">{props.game.minPlayers}人以上で開始できます。</div>}
        {props.game.id === "werewolf" && !hasValidRoleCount && <div className="notice">カードを合計{roleTargetCards}枚にしてください。</div>}
        {props.game.id === "number-talk" && (
          <>
            <RuleDetails
              title="ルール"
              summary="自分の数字を直接言わず、お題に沿って会話し、小さい順に並びます。"
              details={["数字は1から100で固定です。", "手札は1人1枚です。", "全員の数字確認後、会話して並び順を決め、結果で数字を公開します。"]}
            />
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.numberConfig.topicCategory}
                options={["normal", "twist", "love"]}
                labels={{ normal: "通常", twist: "変化球", love: "恋愛" }}
                onChange={(value) => props.setNumberConfig(withNextNumberTalkTopic(props.numberConfig, value as NumberTalkCategory))}
              />
            </SettingRow>
            {numberTopicPreview && (
              <section className="topic-preview-card">
                <div>
                  <span className="field-label">今回のお題</span>
                  <strong>{numberTopicPreview.text}</strong>
                  <small>
                    {numberTopicPreview.lowLabel ?? "小さい"} ↔ {numberTopicPreview.highLabel ?? "大きい"}
                  </small>
                </div>
                <button className="secondary compact-button" type="button" onClick={() => props.setNumberConfig(withNextNumberTalkTopic(props.numberConfig))}>
                  お題を変える
                </button>
              </section>
            )}
            <SettingRow title="時間" detail="会話時間">
              <Segmented
                value={String(props.numberConfig.discussionTimeSec)}
                options={["180", "300"]}
                labels={{ "180": "3分", "300": "5分" }}
                onChange={(value) => props.setNumberConfig({ ...props.numberConfig, discussionTimeSec: Number(value) as 180 | 300 })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "werewolf" && (
          <>
            <RuleDetails
              title="ルール"
              summary="役職を確認し、夜の行動、議論、投票で人狼を探します。"
              details={["カードはプレイヤー数+2枚です。", "夜は全員が名前順に画面を見ます。役職が特定されないよう、行動がない人にも夜画面があります。", "怪盗が交換した場合、最終役職で勝敗を判定します。"]}
            />
            <RoleCountEditor
              counts={werewolfConfig.roleCounts}
              targetCards={roleTargetCards}
              onChange={(roleCounts) => props.setWerewolfConfig({ ...werewolfConfig, roleCounts })}
              onReset={() => props.setWerewolfConfig({ ...werewolfConfig, roleCounts: defaultRoleCounts(props.players.length) })}
            />
            <SettingRow title="議論" detail="投票前の会話時間">
              <Segmented
                value={String(props.werewolfConfig.discussionTimeSec)}
                options={["180", "300"]}
                labels={{ "180": "3分", "300": "5分" }}
                onChange={(value) => props.setWerewolfConfig({ ...werewolfConfig, discussionTimeSec: Number(value) as 180 | 300 })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "drinking-games" && (
          <RuleDetails
            title="ルール"
            summary="道具なしで遊べる飲み会ゲームを検索して、ルールを確認できます。"
            details={[
              "ゲームを開始しても勝敗判定や秘密情報はありません。",
              "国フィルタと検索で、人数や場の空気に合うゲームを探します。",
              "同じゲームをAIが重複追加しないよう、別名、重複判定キー、参照元をデータに持たせています。",
              "飲酒の強要や一気飲み前提の遊び方は推奨しません。ソフトドリンクでも遊べる形に置き換えてください。"
            ]}
          />
        )}
        {props.game.id === "word-infiltrator" && (
          <>
            <RuleDetails
              title="ルール"
              summary="1人だけ秘密の言葉を知らないまま、全員がヒントを出して潜入者を探します。"
              details={[
                "多数派は同じ秘密の言葉を見ます。潜入者はカテゴリだけを見ます。",
                "全員が順番に、秘密の言葉に近すぎないヒントを1つ言います。",
                "投票で潜入者を見つけたら、潜入者は最後に秘密の言葉を推理できます。"
              ]}
            />
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.wordInfiltratorConfig.topicCategory}
                options={["all", ...wordInfiltratorCategoryOptions]}
                labels={wordInfiltratorCategoryLabels}
                onChange={(value) => props.setWordInfiltratorConfig({ ...props.wordInfiltratorConfig, topicCategory: value as "all" | WordInfiltratorCategory })}
              />
            </SettingRow>
            <SettingRow title="時間" detail="投票前の会話時間">
              <Segmented
                value={String(props.wordInfiltratorConfig.discussionTimeSec)}
                options={["180", "300"]}
                labels={{ "180": "3分", "300": "5分" }}
                onChange={(value) => props.setWordInfiltratorConfig({ ...props.wordInfiltratorConfig, discussionTimeSec: Number(value) as 180 | 300 })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "insider-guess" && (
          <>
            <RuleDetails
              title="ルール"
              summary="進行役へ質問して答えを探し、その後こっそり答えを知っていた内通者を見つけます。"
              details={[
                "進行役と内通者だけが答えを知ります。市民は答えを知りません。",
                "質問は進行役が「はい」「いいえ」「わからない」で答えられる形にします。",
                "答えを当てたら、誰が内通者だったか投票します。"
              ]}
            />
            <SettingRow title="答え" detail="カテゴリを選択">
              <Segmented
                value={props.insiderGuessConfig.answerCategory}
                options={["all", ...insiderAnswerCategoryOptions]}
                labels={insiderAnswerCategoryLabels}
                onChange={(value) => props.setInsiderGuessConfig({ ...props.insiderGuessConfig, answerCategory: value as "all" | InsiderAnswerCategory })}
              />
            </SettingRow>
            <SettingRow title="質問" detail="答えを探す時間">
              <Segmented
                value={String(props.insiderGuessConfig.questionTimeSec)}
                options={["300", "480"]}
                labels={{ "300": "5分", "480": "8分" }}
                onChange={(value) => props.setInsiderGuessConfig({ ...props.insiderGuessConfig, questionTimeSec: Number(value) as 300 | 480 })}
              />
            </SettingRow>
            <SettingRow title="議論" detail="内通者を探す時間">
              <Segmented
                value={String(props.insiderGuessConfig.discussionTimeSec)}
                options={["120", "180"]}
                labels={{ "120": "2分", "180": "3分" }}
                onChange={(value) => props.setInsiderGuessConfig({ ...props.insiderGuessConfig, discussionTimeSec: Number(value) as 120 | 180 })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "spy-location" && (
          <>
            <RuleDetails
              title="ルール"
              summary="全員は同じ場所を知っています。1人だけ場所を知らないスパイを質問で探します。"
              details={[
                "スパイ以外には場所を表示します。スパイには場所を表示しません。",
                "質問しながら、相手が場所を知っているか見極めます。",
                "告発でスパイを当てるか、スパイが場所を当てると決着します。"
              ]}
            />
            <SettingRow title="場所" detail="カテゴリを選択">
              <Segmented
                value={props.spyLocationConfig.locationCategory}
                options={["all", ...spyLocationCategoryOptions]}
                labels={spyLocationCategoryLabels}
                onChange={(value) => props.setSpyLocationConfig({ ...props.spyLocationConfig, locationCategory: value as "all" | SpyLocationCategory })}
              />
            </SettingRow>
            <SettingRow title="質問" detail="質問時間">
              <Segmented
                value={String(props.spyLocationConfig.questionTimeSec)}
                options={["480", "600"]}
                labels={{ "480": "8分", "600": "10分" }}
                onChange={(value) => props.setSpyLocationConfig({ ...props.spyLocationConfig, questionTimeSec: Number(value) as 480 | 600 })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "spectrum-meter" && (
          <>
            <RuleDetails
              title="ルール"
              summary="2チームで、親だけが見た正解位置をヒントから推理します。先に10点へ到達したチームの勝利です。"
              details={[
                "開始時に2チームへ自動で分かれ、後攻のBチームは1点から始まります。",
                "親チームはヒントから正解位置を推測し、相手チームは正解が推測より左右どちらかを予想します。",
                "親チームは近さで2〜4点、相手チームは左右予想成功で1点を獲得します。4点を取っても負けている場合は連続手番です。"
              ]}
            />
            <SettingRow title="尺度" detail="カテゴリを選択">
              <Segmented
                value={props.spectrumMeterConfig.scaleCategory}
                options={["all", ...spectrumScaleCategoryOptions]}
                labels={spectrumScaleCategoryLabels}
                onChange={(value) => props.setSpectrumMeterConfig({ ...props.spectrumMeterConfig, scaleCategory: value as "all" | SpectrumScaleCategory })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "ranking-answers" && (
          <>
            <RuleDetails
              title="ルール"
              summary="各自の1-10の秘密番号に合う回答を出し、キャプテンが小さい順に並べます。"
              details={[
                "数字は1から10で、1人1つずつ秘密に確認します。",
                "全員が数字の強さに合う回答を言い、キャプテンだけが順番を並べます。",
                "公開した数字が前より小さくなったらミスです。トークンが0になる前に5ラウンド遊び切れば成功です。"
              ]}
            />
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.rankingAnswersConfig.promptCategory}
                options={["all", ...rankingAnswerCategoryOptions]}
                labels={rankingAnswerCategoryLabels}
                onChange={(value) => props.setRankingAnswersConfig({ ...props.rankingAnswersConfig, promptCategory: value as "all" | RankingAnswerCategory })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "fake-artist" && (
          <>
            <RuleDetails
              title="ルール"
              summary="出題者以外が1本ずつ線を描き、1人だけお題を知らない偽物を探します。"
              details={[
                "出題者はカテゴリとお題を見ますが、描画と投票には参加しません。",
                "本物はカテゴリとお題を見ます。偽物はカテゴリだけを見ます。",
                "出題者以外が2周、1本ずつ線を描きます。",
                "投票で偽物が単独最多票でも、偽物がお題を当てたら偽物側の勝利です。"
              ]}
            />
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.fakeArtistConfig.topicCategory}
                options={["all", ...fakeArtistCategoryOptions]}
                labels={fakeArtistCategoryLabels}
                onChange={(value) => props.setFakeArtistConfig({ ...props.fakeArtistConfig, topicCategory: value as "all" | FakeArtistCategory })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "majority-match" && (
          <>
            <RuleDetails
              title="ルール"
              summary="全員が秘密に回答し、いちばん多かった答えと同じ人が得点します。"
              details={[
                "相談せず、ほかの人も書きそうな短い答えを入力します。",
                "同じ回答が2人以上いれば、最多グループの全員が1点です。",
                "同数最多が複数ある場合はどちらも得点し、5問の合計点を競います。"
              ]}
            />
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.majorityMatchConfig.promptCategory}
                options={["all", ...majorityMatchCategoryOptions]}
                labels={majorityMatchCategoryLabels}
                onChange={(value) => props.setMajorityMatchConfig({ ...props.majorityMatchConfig, promptCategory: value as "all" | MajorityMatchCategory })}
              />
            </SettingRow>
          </>
        )}
        {props.game.id === "one-word-clue" && (
          <>
            <RuleDetails
              title="ルール"
              summary="回答者以外が一つずつ秘密のヒントを出し、残ったヒントだけで答えを当てます。"
              details={[
                "回答者はお題を見ません。ほかの人は一人ずつお題を見て、短いヒントを入力します。",
                "同じヒントは自動で消えます。似すぎたヒントや答えを含むヒントも、回答者へ渡す前に取り消します。",
                "回答者は残ったヒントを見て1回だけ回答し、5問中の正解数を競います。"
              ]}
            />
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.oneWordClueConfig.wordCategory}
                options={["all", ...oneWordClueCategoryOptions]}
                labels={oneWordClueCategoryLabels}
                onChange={(value) => props.setOneWordClueConfig({ ...props.oneWordClueConfig, wordCategory: value as "all" | OneWordClueCategory })}
              />
            </SettingRow>
          </>
        )}
        <button className="primary" type="button" onClick={props.onStart} disabled={!canStart || props.isStarting}>
          {props.isStarting ? "準備中..." : props.game.id === "drinking-games" ? "一覧を見る" : "はじめる"}
        </button>
        <AdSlot context="gameSetup" />
      </div>
    </section>
  );
}

function NumberTalkGame(props: {
  state: NumberTalkState;
  setState: (state: NumberTalkState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];

  if (props.state.phase === "handoff") {
    return <PassDevice label="数字確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "revealNumber" })} />;
  }

  if (props.state.phase === "revealNumber") {
    const number = getNumberForPlayer(props.state, currentPlayer.id);
    return (
      <section className="screen">
        <Topbar title="数字確認" eyebrow="ナンバートーク" />
        <div className="content">
          <div className="topic">{props.state.topic.text}</div>
          <div className="number-card">
            <span className="muted">{currentPlayer.nickname}の数字</span>
            <strong>{number}</strong>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() => {
              const revealed = [...new Set([...props.state.revealedPlayerIds, currentPlayer.id])];
              const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
              props.setState({
                ...props.state,
                revealedPlayerIds: revealed,
                currentPlayerIndex: isLast ? props.state.currentPlayerIndex : props.state.currentPlayerIndex + 1,
                phase: isLast ? "discussion" : "handoff"
              });
            }}
          >
            隠して渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "discussion") {
    return (
      <section className="screen">
        <Topbar title="会話" eyebrow="ナンバートーク" />
        <div className="content">
          <div className="topic">{props.state.topic.text}</div>
          <div className="hint-row">
            <span>{props.state.topic.lowLabel ?? "小さい"}</span>
            <span>{props.state.topic.highLabel ?? "大きい"}</span>
          </div>
          <CountdownTimer seconds={props.state.config.discussionTimeSec} />
          <PlayerStrip players={props.players} />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "ordering" })}>
            並び順を決める
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "ordering") {
    const orderPlayers = props.state.order.map((id) => props.players.find((player) => player.id === id)).filter(Boolean) as Player[];
    return (
      <section className="screen">
        <Topbar title="並び順" eyebrow="ナンバートーク" onBack={() => props.setState({ ...props.state, phase: "discussion" })} />
        <div className="content">
          <div className="topic">小さいと思う順に並べる</div>
          <div className="order-list">
            {orderPlayers.map((player, index) => (
              <div key={player.id} className="order-item">
                <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                <strong>{player.nickname}</strong>
                <button className="small-button" type="button" onClick={() => moveNumberOrder(props.state, props.setState, index, -1)}>
                  ↑
                </button>
                <button className="small-button" type="button" onClick={() => moveNumberOrder(props.state, props.setState, index, 1)}>
                  ↓
                </button>
              </div>
            ))}
          </div>
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "result" })}>
            結果を見る
          </button>
        </div>
      </section>
    );
  }

  const success = isNumberOrderCorrect(props.state);
  const numberResultRows = getNumberResultRows(props.state, props.players);
  const correctOrderCopy = numberResultRows
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((item) => `${item.player.nickname}(${item.number})`)
    .join(" → ");
  const firstMistake = numberResultRows.find((item) => item.breaksOrder);
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="ナンバートーク" />
      <div className="content">
        <div className="topic">{success ? "成功" : "失敗"}</div>
        <p className="muted">{success ? "小さい順に並んでいました。" : `${firstMistake?.player.nickname ?? "途中"}で前の数字より小さくなっています。`}</p>
        <div className="result-list">
          {numberResultRows.map(({ player, number, breaksOrder }) => {
            return (
              <div key={player.id} className={`result-row ${breaksOrder ? "result-row-alert" : ""}`}>
                <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                <strong>{player.nickname}</strong>
                <span className="score">
                  {breaksOrder && <small className="status-badge">ここで逆転</small>}
                  {number}
                </span>
              </div>
            );
          })}
        </div>
        {!success && (
          <div className="note">
            <strong>正しい順</strong>
            <span>{correctOrderCopy}</span>
          </div>
        )}
        <AdSlot context="result" />
        <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
      </div>
    </section>
  );
}

function DrinkingGamesBrowser(props: {
  state: DrinkingGamesState;
  setState: (state: DrinkingGamesState) => void;
  onHome: () => void;
}) {
  const countries = drinkingGameCountries();
  const specialCategories = drinkingGameSpecialCategories();
  const gamesToShow = filterDrinkingGames(props.state);

  return (
    <section className="screen">
      <Topbar title="飲み会ゲーム辞典" eyebrow="Database" onBack={props.onHome} />
      <div className="content">
        <div className="search-panel">
          <label className="field-label" htmlFor="drinking-game-search">
            検索
          </label>
          <input
            id="drinking-game-search"
            className="search-input"
            value={props.state.query}
            placeholder="ゲーム名、別名、ルールで検索"
            onChange={(event) => props.setState({ ...props.state, query: event.target.value })}
          />
          <div className="filter-row" role="group" aria-label="カテゴリで絞り込み">
            <button type="button" className={props.state.country === "all" ? "active" : ""} onClick={() => props.setState({ ...props.state, country: "all" })}>
              すべて
            </button>
            {countries.map((country) => (
              <button key={country} type="button" className={props.state.country === country ? "active" : ""} onClick={() => props.setState({ ...props.state, country })}>
                {country}
              </button>
            ))}
            {specialCategories.map((category) => (
              <button key={category} type="button" className={props.state.country === category ? "active special-filter" : "special-filter"} onClick={() => props.setState({ ...props.state, country: category })}>
                {category}
              </button>
            ))}
          </div>
          <div className="filter-section">
            <span className="field-label">刺激度</span>
            <div className="filter-row" role="group" aria-label="刺激度で絞り込み">
              <button type="button" className={props.state.intensity === "all" ? "active" : ""} onClick={() => props.setState({ ...props.state, intensity: "all" })}>
                すべて
              </button>
              <button type="button" className={props.state.intensity === "light" ? "active" : ""} onClick={() => props.setState({ ...props.state, intensity: "light" })}>
                ライト
              </button>
              <button
                type="button"
                className={props.state.intensity === "strong" ? "active strong-filter" : "strong-filter"}
                onClick={() => props.setState({ ...props.state, intensity: "strong" })}
              >
                刺激強め
              </button>
            </div>
          </div>
          <div className="muted">{gamesToShow.length}件</div>
        </div>

        {gamesToShow.length === 0 ? (
          <div className="notice">条件に合うゲームがありません。</div>
        ) : (
          <div className="drink-game-list">
            {gamesToShow.map((game) => (
              <article key={game.id} className={game.intensity === "strong" ? "drink-game-card strong-game-card" : "drink-game-card"}>
                <div className="drink-game-head">
                  <div>
                    <h2>{game.title}</h2>
                    <p>{game.summary}</p>
                  </div>
                  <div className="card-pills">
                    {game.country && <span className="pill">{game.country}</span>}
                    {game.specialCategory && <span className="pill special-pill">{game.specialCategory}</span>}
                    {game.intensity === "strong" && <span className="pill strong-pill">刺激強め</span>}
                  </div>
                </div>
                <div className="drink-game-meta">
                  <span>{game.maxPlayers ? `${game.minPlayers}-${game.maxPlayers}人` : `${game.minPlayers}人以上`}</span>
                  <span>約{game.durationMin}分</span>
                  <span>道具なし</span>
                </div>
                {game.intensity === "strong" && game.contentWarnings && (
                  <div className="drink-game-warning">
                    <strong>含まれる話題</strong>
                    <span>{game.contentWarnings.join("・")}</span>
                    <small>答えたくない内容はパスでき、いつでも終了できます。</small>
                  </div>
                )}
                <details className="drink-game-details">
                  <summary>ルールを見る</summary>
                  <ol>
                    {game.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ol>
                  {game.aliases.length > 0 && <p className="alias-line">別名: {game.aliases.join(" / ")}</p>}
                </details>
              </article>
            ))}
          </div>
        )}
        <AdSlot context="result" />
      </div>
    </section>
  );
}

function WerewolfGame(props: {
  state: WerewolfState;
  setState: (state: WerewolfState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];

  if (props.state.phase === "roleHandoff") {
    return <PassDevice label="役職確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "roleReveal" })} />;
  }

  if (props.state.phase === "roleReveal") {
    const role = roleDefinitions[props.state.playerInitialCards[currentPlayer.id]];
    return (
      <section className="screen">
        <Topbar title="役職確認" eyebrow="ワンナイト人狼" />
        <div className="content">
          <div className="role-card">
            <RoleSymbol roleId={role.roleId} />
            <h2>{role.name}</h2>
            <p>{role.description}</p>
            <RoleDetailList roleId={role.roleId} />
          </div>
          <button
            className="primary"
            type="button"
            onClick={() => {
              const done = [...new Set([...props.state.roleRevealDonePlayerIds, currentPlayer.id])];
              const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
              const nextState: WerewolfState = {
                ...props.state,
                roleRevealDonePlayerIds: done,
                currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
                phase: "roleHandoff"
              };
              props.setState({ ...nextState, phase: isLast ? "nightHandoff" : "roleHandoff" });
            }}
          >
            隠して渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "nightHandoff") {
    return <PassDevice label="夜の確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "nightAction" })} />;
  }

  if (props.state.phase === "nightAction") {
    const roleId = props.state.playerInitialCards[currentPlayer.id];
    const role = roleDefinitions[roleId];
    const advanceNight = () => advanceWerewolfNightPlayer(props.state, props.setState, props.players);

    if (roleId === "seer") {
      const action = props.state.nightActions.find((item): item is Extract<WerewolfNightAction, { type: "seer" }> => item.type === "seer" && item.actorId === currentPlayer.id);
      if (action) {
        const target = action.mode === "player" ? props.players.find((player) => player.id === action.targetPlayerId) : null;
        const result =
          action.mode === "center"
            ? `中央: ${(action.seenCenterCards ?? props.state.centerCards).map((seenRoleId) => roleDefinitions[seenRoleId].name).join(" / ")}`
            : `${target?.nickname ?? "選択したプレイヤー"}: ${roleDefinitions[action.seenRole ?? "villager"].name}`;
        return <NightScreen roleId={roleId} title="夜の確認" text={`${currentPlayer.nickname}だけ確認してください。`} result={result} onNext={advanceNight} />;
      }
      return (
        <section className="screen">
          <Topbar title="夜の確認" eyebrow="ワンナイト人狼" />
          <div className="content">
            <RoleActionIntro player={currentPlayer} roleId={roleId} />
            <div className="vote-grid">
              <button
                className="vote-button"
                type="button"
                onClick={() => {
                  const next = structuredClone(props.state);
                  applySeerAction(next, currentPlayer.id, { mode: "center" });
                  props.setState(next);
                }}
              >
                中央2枚を見る
              </button>
              {props.players
                .filter((player) => player.id !== currentPlayer.id)
                .map((player) => (
                  <button
                    key={player.id}
                    className="vote-button"
                    type="button"
                    onClick={() => {
                      const next = structuredClone(props.state);
                      applySeerAction(next, currentPlayer.id, { mode: "player", targetPlayerId: player.id });
                      props.setState(next);
                    }}
                  >
                    {player.nickname}を見る
                  </button>
                ))}
            </div>
          </div>
        </section>
      );
    }

    if (roleId === "werewolf") {
      const wolves = props.players.filter((player) => props.state.playerInitialCards[player.id] === "werewolf");
      const otherWolves = wolves.filter((wolf) => wolf.id !== currentPlayer.id);
      const result = otherWolves.length ? `仲間: ${otherWolves.map((wolf) => wolf.nickname).join(" / ")}` : "あなたは単独の人狼です。";
      return (
        <NightScreen
          roleId={roleId}
          title="夜の確認"
          text={`${currentPlayer.nickname}だけ確認してください。`}
          result={result}
          onNext={() => {
            const next = structuredClone(props.state);
            recordWerewolfAction(next, props.players);
            advanceWerewolfNightPlayer(next, props.setState, props.players);
          }}
        />
      );
    }

    if (roleId === "robber") {
      const action = props.state.nightActions.find((item): item is Extract<WerewolfNightAction, { type: "robber" }> => item.type === "robber" && item.actorId === currentPlayer.id);
      if (action) {
        const target = props.players.find((player) => player.id === action.targetPlayerId);
        const result = action.skipped ? `今の役職: ${roleDefinitions[action.newRole ?? "robber"].name}` : `${target?.nickname ?? "選択したプレイヤー"}と交換 / 今の役職: ${roleDefinitions[action.newRole ?? "villager"].name}`;
        return <NightScreen roleId={roleId} title="夜の確認" text={`${currentPlayer.nickname}だけ確認してください。`} result={result} onNext={advanceNight} />;
      }
      return (
        <section className="screen">
          <Topbar title="夜の確認" eyebrow="ワンナイト人狼" />
          <div className="content">
            <RoleActionIntro player={currentPlayer} roleId={roleId} />
            <div className="vote-grid">
              {props.players
                .filter((player) => player.id !== currentPlayer.id)
                .map((player) => (
                  <button
                    key={player.id}
                    className="vote-button"
                    type="button"
                    onClick={() => {
                      const next = structuredClone(props.state);
                      applyRobberAction(next, currentPlayer.id, player.id);
                      props.setState(next);
                    }}
                  >
                    {player.nickname}と交換
                  </button>
                ))}
              <button
                className="vote-button"
                type="button"
                onClick={() => {
                  const next = structuredClone(props.state);
                  applyRobberAction(next, currentPlayer.id);
                  props.setState(next);
                }}
              >
                交換しない
              </button>
            </div>
          </div>
        </section>
      );
    }

    return <NightScreen roleId={roleId} title="夜の確認" text={`${currentPlayer.nickname}だけ確認してください。`} result={role.nightAction} onNext={advanceNight} />;
  }

  if (props.state.phase === "discussion") {
    return (
      <section className="screen">
        <Topbar title="議論" eyebrow="ワンナイト人狼" />
        <div className="content">
          <CountdownTimer seconds={props.state.config.discussionTimeSec} />
          <PlayerStrip players={props.players} />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "voteHandoff", currentPlayerIndex: 0, votes: [] })}>
            投票へ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "voteHandoff") {
    return <PassDevice label="投票" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "vote" })} />;
  }

  if (props.state.phase === "vote") {
    return (
      <section className="screen">
        <Topbar title="投票" eyebrow="ワンナイト人狼" />
        <div className="content">
          <div className="pass-sub">{currentPlayer.nickname}の投票</div>
          <div className="vote-grid">
            {props.players.filter((player) => player.id !== currentPlayer.id).map((player) => (
              <button key={player.id} className="vote-button" type="button" onClick={() => submitWerewolfVote(props.state, props.setState, props.players, { fromPlayerId: currentPlayer.id, targetType: "player", targetPlayerId: player.id })}>
                {player.nickname}
              </button>
            ))}
            <button className="vote-button" type="button" onClick={() => submitWerewolfVote(props.state, props.setState, props.players, { fromPlayerId: currentPlayer.id, targetType: "peace" })}>
              平和村
            </button>
          </div>
        </div>
      </section>
    );
  }

  const result = judgeWerewolf(props.state, props.players);
  const executedNames = result.executedPlayerIds.map((playerId) => props.players.find((player) => player.id === playerId)?.nickname).filter(Boolean).join(" / ");
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="ワンナイト人狼" />
      <div className="content">
        <div className="topic">{result.winningTeam === "human" ? "人間チームの勝利" : result.winningTeam === "werewolf" ? "人狼チームの勝利" : "全員勝利"}</div>
        <p className="muted">{result.reason}</p>
        <div className="note">
          <strong>処刑</strong>
          <span>{executedNames || "なし"}</span>
        </div>
        <div className="result-list">
          {props.players.map((player) => (
            <div key={player.id} className="result-row">
              <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
              <strong>{player.nickname}</strong>
              <span className="score">
                {roleDefinitions[props.state.playerCurrentCards[player.id]].name}
                <small>最初: {roleDefinitions[props.state.playerInitialCards[player.id]].name}</small>
                <small>投票: {formatWerewolfVote(props.state.votes.find((vote) => vote.fromPlayerId === player.id), props.players)}</small>
              </span>
            </div>
          ))}
        </div>
        <div className="topic">中央: {props.state.centerCards.map((roleId) => roleDefinitions[roleId].name).join(" / ")}</div>
        <AdSlot context="result" />
        <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
      </div>
    </section>
  );
}

function submitWerewolfVote(state: WerewolfState, setState: (state: WerewolfState) => void, players: Player[], vote: WerewolfVote) {
  const votes = [...state.votes.filter((item) => item.fromPlayerId !== vote.fromPlayerId), vote];
  const isLast = state.currentPlayerIndex >= players.length - 1;
  setState({
    ...state,
    votes,
    currentPlayerIndex: isLast ? state.currentPlayerIndex : state.currentPlayerIndex + 1,
    phase: isLast ? "result" : "voteHandoff"
  });
}

function advanceWerewolfNightPlayer(state: WerewolfState, setState: (state: WerewolfState) => void, players: Player[]) {
  const next = structuredClone(state);
  const isLast = next.currentPlayerIndex >= players.length - 1;
  if (isLast) {
    resolveWerewolfNightActions(next);
  }
  setState({
    ...next,
    currentPlayerIndex: isLast ? 0 : next.currentPlayerIndex + 1,
    phase: isLast ? "discussion" : "nightHandoff"
  });
}

function formatWerewolfVote(vote: WerewolfVote | undefined, players: Player[]) {
  if (!vote) return "未投票";
  if (vote.targetType === "peace") return "平和村";
  return players.find((player) => player.id === vote.targetPlayerId)?.nickname ?? "不明";
}

function moveNumberOrder(state: NumberTalkState, setState: (state: NumberTalkState) => void, index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.order.length) return;
  const order = [...state.order];
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  setState({ ...state, order });
}

function getNumberResultRows(state: NumberTalkState, players: Player[]) {
  let previousNumber = -Infinity;
  return state.order
    .map((playerId) => {
      const player = players.find((item) => item.id === playerId);
      if (!player) return null;
      const number = getNumberForPlayer(state, player.id);
      const breaksOrder = number < previousNumber;
      previousNumber = number;
      return { player, number, breaksOrder };
    })
    .filter((item): item is { player: Player; number: number; breaksOrder: boolean } => Boolean(item));
}

function NightScreen(props: { roleId?: RoleId; title: string; text: string; result?: string; onNext: () => void }) {
  return (
    <section className="screen">
      <Topbar title={props.title} eyebrow="ワンナイト人狼" />
      <div className="content">
        <div className="role-card">
          {props.roleId && <RoleSymbol roleId={props.roleId} />}
          <h2>{props.title}</h2>
          <p>{props.text}</p>
          {props.result && <div className="topic">{props.result}</div>}
        </div>
        <button className="primary" type="button" onClick={props.onNext}>
          次へ
        </button>
      </div>
    </section>
  );
}

function RoleSymbol(props: { roleId: RoleId }) {
  return (
    <div className={`role-symbol role-symbol-${props.roleId}`} aria-hidden="true">
      <RoleIcon roleId={props.roleId} />
    </div>
  );
}

function RoleIcon(props: { roleId: RoleId }) {
  if (props.roleId === "werewolf") {
    return (
      <svg viewBox="0 0 64 64" focusable="false">
        <path d="M17 48 24 20l10 10 10-10 7 28-8 10H25z" />
        <path d="M26 43h5M38 43h5" />
        <path d="M29 51h6l6-6" />
      </svg>
    );
  }
  if (props.roleId === "seer") {
    return (
      <svg viewBox="0 0 64 64" focusable="false">
        <path d="M10 32s8-14 22-14 22 14 22 14-8 14-22 14S10 32 10 32z" />
        <circle cx="32" cy="32" r="8" />
        <path d="M32 8v6M32 50v6M12 16l5 5M52 16l-5 5" />
      </svg>
    );
  }
  if (props.roleId === "robber") {
    return (
      <svg viewBox="0 0 64 64" focusable="false">
        <path d="M12 30c7-8 33-8 40 0v10c-7 8-33 8-40 0z" />
        <path d="M23 37h8M36 37h8" />
        <path d="M22 25c1-8 6-13 10-13s9 5 10 13" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" focusable="false">
      <path d="M12 32 32 14l20 18v20H38V39H26v13H12z" />
      <path d="M24 52V39h16v13" />
    </svg>
  );
}

function RoleDetailList(props: { roleId: RoleId }) {
  const role = roleDefinitions[props.roleId];
  return (
    <div className="role-detail-list">
      <div>
        <strong>夜にすること</strong>
        <span>{role.nightAction}</span>
      </div>
      <div>
        <strong>議論で考えること</strong>
        <span>{role.discussionHint}</span>
      </div>
      <div>
        <strong>勝利条件への影響</strong>
        <span>{role.winConditionHint}</span>
      </div>
    </div>
  );
}

function RoleActionIntro(props: { player: Player; roleId: RoleId }) {
  const role = roleDefinitions[props.roleId];
  return (
    <div className="role-card compact-role-card">
      <RoleSymbol roleId={props.roleId} />
      <h2>{props.player.nickname}</h2>
      <p>
        {role.name}: {role.nightAction}
      </p>
    </div>
  );
}

function RuleDetails(props: { title: string; summary: string; details: string[] }) {
  return (
    <section className="rule-card">
      <h2>{props.title}</h2>
      <p>{props.summary}</p>
      <details>
        <summary>詳しいルール</summary>
        <ul>
          {props.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function RoleCountEditor(props: { counts: RoleCounts; targetCards: number; onChange: (counts: RoleCounts) => void; onReset: () => void }) {
  const total = countRoleCards(props.counts);
  function changeRoleCount(roleId: RoleId, delta: -1 | 1) {
    const next = { ...props.counts };
    if (delta === 1) {
      if (total >= props.targetCards) {
        if (roleId === "villager" || next.villager <= 0) return;
        next.villager -= 1;
      }
      next[roleId] += 1;
    } else {
      if (next[roleId] <= 0) return;
      if (roleId === "villager" && total <= props.targetCards) return;
      next[roleId] -= 1;
      if (total <= props.targetCards && roleId !== "villager") {
        next.villager += 1;
      }
    }
    props.onChange(next);
  }

  return (
    <section className="role-count-card">
      <div className="role-count-head">
        <div>
          <strong>役職カード</strong>
          <span>
            {total}/{props.targetCards}枚
          </span>
        </div>
        <span className={total === props.targetCards ? "count-ok" : "count-warn"}>{total === props.targetCards ? "OK" : "調整中"}</span>
      </div>
      <button className="secondary compact-button" type="button" onClick={props.onReset}>
        おすすめ構成に戻す
      </button>
      <div className="role-count-list">
        {WEREWOLF_ROLE_IDS.map((roleId) => {
          const role = roleDefinitions[roleId];
          return (
            <div key={roleId} className="role-count-row">
              <RoleSymbol roleId={roleId} />
              <div>
                <strong>{role.name}</strong>
                <span>{role.actionSummary}</span>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => changeRoleCount(roleId, -1)} disabled={props.counts[roleId] <= 0 || (roleId === "villager" && total <= props.targetCards)}>
                  −
                </button>
                <strong>{props.counts[roleId]}</strong>
                <button type="button" onClick={() => changeRoleCount(roleId, 1)} disabled={total >= props.targetCards && (roleId === "villager" || props.counts.villager <= 0)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SettingRow(props: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{props.title}</strong>
        <span>{props.detail}</span>
      </div>
      {props.children}
    </div>
  );
}

function Segmented(props: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <div className="segmented">
      {props.options.map((option) => (
        <button key={option} className={props.value === option ? "active" : ""} type="button" onClick={() => props.onChange(option)}>
          {props.labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}

function restorePersistedAppState(): RestoredAppState | null {
  const persisted = sanitizePersistedAppState(loadAppState<PersistedAppState>());
  if (!persisted) return null;

  let numberState: NumberTalkState | null = null;
  let werewolfState: WerewolfState | null = null;
  let drinkingGamesState: DrinkingGamesState | null = null;
  let wordInfiltratorState: WordInfiltratorState | null = null;
  let insiderGuessState: InsiderGuessState | null = null;
  let spyLocationState: SpyLocationState | null = null;
  let spectrumMeterState: SpectrumMeterState | null = null;
  let rankingAnswersState: RankingAnswersState | null = null;
  let fakeArtistState: FakeArtistState | null = null;
  let majorityMatchState: MajorityMatchState | null = null;
  let oneWordClueState: OneWordClueState | null = null;

  if (persisted.activeSession?.gameId === "number-talk") {
    numberState = sanitizeLoadedNumberTalkState(loadGameSession<NumberTalkState>(persisted.activeSession.sessionId, "number-talk")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "werewolf") {
    werewolfState = sanitizeLoadedWerewolfState(loadGameSession<WerewolfState>(persisted.activeSession.sessionId, "werewolf")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "drinking-games") {
    drinkingGamesState = sanitizeLoadedDrinkingGamesState(loadGameSession<DrinkingGamesState>(persisted.activeSession.sessionId, "drinking-games")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "word-infiltrator") {
    wordInfiltratorState = sanitizeLoadedWordInfiltratorState(loadGameSession<WordInfiltratorState>(persisted.activeSession.sessionId, "word-infiltrator")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "insider-guess") {
    insiderGuessState = sanitizeLoadedInsiderGuessState(loadGameSession<InsiderGuessState>(persisted.activeSession.sessionId, "insider-guess")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "spy-location") {
    spyLocationState = sanitizeLoadedSpyLocationState(loadGameSession<SpyLocationState>(persisted.activeSession.sessionId, "spy-location")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "spectrum-meter") {
    spectrumMeterState = sanitizeLoadedSpectrumMeterState(loadGameSession<SpectrumMeterState>(persisted.activeSession.sessionId, "spectrum-meter")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "ranking-answers") {
    rankingAnswersState = sanitizeLoadedRankingAnswersState(loadGameSession<RankingAnswersState>(persisted.activeSession.sessionId, "ranking-answers")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "fake-artist") {
    fakeArtistState = sanitizeLoadedFakeArtistState(loadGameSession<FakeArtistState>(persisted.activeSession.sessionId, "fake-artist")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "majority-match") {
    majorityMatchState = sanitizeLoadedMajorityMatchState(loadGameSession<MajorityMatchState>(persisted.activeSession.sessionId, "majority-match")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "one-word-clue") {
    oneWordClueState = sanitizeLoadedOneWordClueState(loadGameSession<OneWordClueState>(persisted.activeSession.sessionId, "one-word-clue")?.state ?? null);
  }

  const hasActiveState = Boolean(
    numberState ??
      werewolfState ??
      drinkingGamesState ??
      wordInfiltratorState ??
      insiderGuessState ??
      spyLocationState ??
      spectrumMeterState ??
      rankingAnswersState ??
      fakeArtistState ??
      majorityMatchState ??
      oneWordClueState
  );
  if (persisted.screen === "game" && !hasActiveState) {
    persisted.screen = "home";
    persisted.selectedGame = null;
    persisted.activeSession = null;
  }

  return {
    ...persisted,
    numberState,
    werewolfState,
    drinkingGamesState,
    wordInfiltratorState,
    insiderGuessState,
    spyLocationState,
    spectrumMeterState,
    rankingAnswersState,
    fakeArtistState,
    majorityMatchState,
    oneWordClueState
  };
}

function getActiveGameState(
  gameId: GameId,
  states: {
    numberState: NumberTalkState | null;
    werewolfState: WerewolfState | null;
    drinkingGamesState: DrinkingGamesState | null;
    wordInfiltratorState: WordInfiltratorState | null;
    insiderGuessState: InsiderGuessState | null;
    spyLocationState: SpyLocationState | null;
    spectrumMeterState: SpectrumMeterState | null;
    rankingAnswersState: RankingAnswersState | null;
    fakeArtistState: FakeArtistState | null;
    majorityMatchState: MajorityMatchState | null;
    oneWordClueState: OneWordClueState | null;
  }
) {
  if (gameId === "number-talk") return states.numberState;
  if (gameId === "werewolf") return states.werewolfState;
  if (gameId === "drinking-games") return states.drinkingGamesState;
  if (gameId === "word-infiltrator") return states.wordInfiltratorState;
  if (gameId === "insider-guess") return states.insiderGuessState;
  if (gameId === "spy-location") return states.spyLocationState;
  if (gameId === "spectrum-meter") return states.spectrumMeterState;
  if (gameId === "ranking-answers") return states.rankingAnswersState;
  if (gameId === "fake-artist") return states.fakeArtistState;
  if (gameId === "majority-match") return states.majorityMatchState;
  return states.oneWordClueState;
}

function sanitizePersistedAppState(state: PersistedAppState | null): PersistedAppState | null {
  if (!state) return null;
  const next = structuredClone(state);

  next.activeSession = next.activeSession ?? null;
  if (next.selectedGame && !isGameAvailable(next.selectedGame)) {
    next.screen = "home";
    next.selectedGame = null;
    next.activeSession = null;
  }
  if (next.screen !== "game") {
    next.activeSession = null;
  }

  if (next.screen === "game" && (!next.selectedGame || !next.activeSession || next.activeSession.gameId !== next.selectedGame)) {
    next.screen = "home";
    next.selectedGame = null;
    next.activeSession = null;
  }
  return next;
}

function sanitizeLoadedNumberTalkState(state: NumberTalkState | null): NumberTalkState | null {
  return sanitizeReloadPhase(state, {
    revealNumber: "handoff",
    confirmOrder: "ordering"
  });
}

function sanitizeLoadedWerewolfState(state: WerewolfState | null): WerewolfState | null {
  const next = sanitizeReloadPhase(
    state,
    {
      roleReveal: "roleHandoff",
      vote: "voteHandoff"
    },
    [{ prefix: "night", fallback: "nightHandoff" }]
  );
  if (!next) return null;
  if (typeof next.nightResolved !== "boolean") {
    next.nightResolved = hasLegacyRobberSwapAlreadyApplied(next) || ["discussion", "voteHandoff", "vote", "result"].includes(next.phase);
  }
  return next;
}

function hasLegacyRobberSwapAlreadyApplied(state: WerewolfState) {
  const robberAction = state.nightActions.find((action): action is Extract<WerewolfNightAction, { type: "robber" }> => action.type === "robber");
  if (!robberAction?.actorId || !robberAction.targetPlayerId || robberAction.skipped || !robberAction.newRole) return false;
  return state.playerCurrentCards[robberAction.actorId] === robberAction.newRole && state.playerCurrentCards[robberAction.targetPlayerId] === state.playerInitialCards[robberAction.actorId];
}

function sanitizeLoadedDrinkingGamesState(state: DrinkingGamesState | null): DrinkingGamesState | null {
  if (!state) return null;
  const next = structuredClone(state);
  next.phase = "browse";
  next.country = next.country ?? "all";
  next.intensity = next.intensity === "light" || next.intensity === "strong" ? next.intensity : "all";
  next.query = next.query ?? "";
  return next;
}

function sanitizeLoadedWordInfiltratorState(state: WordInfiltratorState | null): WordInfiltratorState | null {
  return sanitizeReloadPhase(state, {
    revealSecret: "handoff",
    vote: "voteHandoff"
  });
}

function sanitizeLoadedInsiderGuessState(state: InsiderGuessState | null): InsiderGuessState | null {
  return sanitizeReloadPhase(state, {
    roleReveal: "roleHandoff",
    answerReveal: "answerHandoff",
    vote: "voteHandoff"
  });
}

function sanitizeLoadedSpyLocationState(state: SpyLocationState | null): SpyLocationState | null {
  return sanitizeReloadPhase(state, {
    revealSecret: "handoff",
    accusationVote: "accusationVoteHandoff",
    spyGuess: "spyGuessHandoff"
  });
}

function sanitizeLoadedSpectrumMeterState(state: SpectrumMeterState | null): SpectrumMeterState | null {
  if (!state || !("teamPlayerIds" in state) || !("teamScores" in state) || !("seed" in state)) return null;
  return sanitizeReloadPhase(state, {
    psychicReveal: "psychicHandoff"
  });
}

function sanitizeLoadedRankingAnswersState(state: RankingAnswersState | null): RankingAnswersState | null {
  return sanitizeReloadPhase(state, {
    numberReveal: "numberHandoff"
  });
}

function sanitizeLoadedFakeArtistState(state: FakeArtistState | null): FakeArtistState | null {
  const next = sanitizeReloadPhase(state, {
    revealSecret: "handoff",
    vote: "voteHandoff"
  });
  if (!next) return null;
  if (!next.questionMasterPlayerId) {
    next.questionMasterPlayerId = next.drawOrder.find((playerId) => playerId !== next.fakeArtistPlayerId) ?? next.drawOrder[0] ?? next.fakeArtistPlayerId;
  }
  next.drawOrder = next.drawOrder.filter((playerId) => playerId !== next.questionMasterPlayerId);
  return next;
}

function sanitizeLoadedMajorityMatchState(state: MajorityMatchState | null): MajorityMatchState | null {
  return sanitizeReloadPhase(state, {
    answer: "answerHandoff"
  });
}

function sanitizeLoadedOneWordClueState(state: OneWordClueState | null): OneWordClueState | null {
  return sanitizeReloadPhase(state, {
    clueEntry: "clueHandoff",
    clueReview: "reviewHandoff",
    guess: "guesserHandoff"
  });
}
