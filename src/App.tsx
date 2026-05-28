import L from "leaflet";
import type * as React from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CountdownTimer } from "./components/CountdownTimer";
import { canShowAds } from "./core/adPolicy";
import { games, getGameDefinition } from "./core/gameRegistry";
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
import { ActiveSessionRef, GameId, GameSummary, PLAYER_COLORS, Player } from "./core/types";
import {
  createGeoAnswer,
  currentGeoLocation,
  defaultGeoConfig,
  GeoAnswer,
  GeoConfig,
  GeoState,
  roundAnswers,
  totalGeoScore
} from "./games/geoGuessr";
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
import { loadMapillaryStreetImage, type StreetImageLoadResult } from "./games/mapillaryProvider";
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

type Screen = "home" | "players" | "setup" | "game";

const AddedTableGameScreens = lazy(() => import("./features/AddedTableGames"));
const addedTableGameIds = ["word-infiltrator", "insider-guess", "spy-location", "spectrum-meter", "ranking-answers", "fake-artist"] as const satisfies readonly GameId[];

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

type PersistedAppState = {
  screen: Screen;
  selectedGame: GameId | null;
  players: Player[];
  geoConfig: GeoConfig;
  numberConfig: NumberTalkConfig;
  werewolfConfig: WerewolfConfig;
  drinkingGamesConfig: DrinkingGamesConfig;
  wordInfiltratorConfig: WordInfiltratorConfig;
  insiderGuessConfig: InsiderGuessConfig;
  spyLocationConfig: SpyLocationConfig;
  spectrumMeterConfig: SpectrumMeterConfig;
  rankingAnswersConfig: RankingAnswersConfig;
  fakeArtistConfig: FakeArtistConfig;
  activeSession: ActiveSessionRef | null;
};

type RestoredAppState = PersistedAppState & {
  geoState: GeoState | null;
  numberState: NumberTalkState | null;
  werewolfState: WerewolfState | null;
  drinkingGamesState: DrinkingGamesState | null;
  wordInfiltratorState: WordInfiltratorState | null;
  insiderGuessState: InsiderGuessState | null;
  spyLocationState: SpyLocationState | null;
  spectrumMeterState: SpectrumMeterState | null;
  rankingAnswersState: RankingAnswersState | null;
  fakeArtistState: FakeArtistState | null;
};

export function App() {
  const restored = useMemo(() => restorePersistedAppState(), []);
  const [screen, setScreen] = useState<Screen>(restored?.screen ?? "home");
  const [selectedGame, setSelectedGame] = useState<GameId | null>(restored?.selectedGame ?? null);
  const [players, setPlayers] = useState<Player[]>(() => restored?.players ?? loadPlayers());
  const [geoConfig, setGeoConfig] = useState<GeoConfig>(() => restored?.geoConfig ?? defaultGeoConfig());
  const [numberConfig, setNumberConfig] = useState<NumberTalkConfig>(() => restored?.numberConfig ?? defaultNumberTalkConfig());
  const [werewolfConfig, setWerewolfConfig] = useState<WerewolfConfig>(() => normalizeWerewolfConfig(restored?.werewolfConfig ?? defaultWerewolfConfig(), players.length));
  const [drinkingGamesConfig] = useState<DrinkingGamesConfig>(() => restored?.drinkingGamesConfig ?? defaultDrinkingGamesConfig());
  const [wordInfiltratorConfig, setWordInfiltratorConfig] = useState<WordInfiltratorConfig>(() => restored?.wordInfiltratorConfig ?? defaultWordInfiltratorConfig());
  const [insiderGuessConfig, setInsiderGuessConfig] = useState<InsiderGuessConfig>(() => restored?.insiderGuessConfig ?? defaultInsiderGuessConfig());
  const [spyLocationConfig, setSpyLocationConfig] = useState<SpyLocationConfig>(() => restored?.spyLocationConfig ?? defaultSpyLocationConfig());
  const [spectrumMeterConfig, setSpectrumMeterConfig] = useState<SpectrumMeterConfig>(() => restored?.spectrumMeterConfig ?? defaultSpectrumMeterConfig());
  const [rankingAnswersConfig, setRankingAnswersConfig] = useState<RankingAnswersConfig>(() => restored?.rankingAnswersConfig ?? defaultRankingAnswersConfig());
  const [fakeArtistConfig, setFakeArtistConfig] = useState<FakeArtistConfig>(() => restored?.fakeArtistConfig ?? defaultFakeArtistConfig());
  const [geoState, setGeoState] = useState<GeoState | null>(restored?.geoState ?? null);
  const [numberState, setNumberState] = useState<NumberTalkState | null>(restored?.numberState ?? null);
  const [werewolfState, setWerewolfState] = useState<WerewolfState | null>(restored?.werewolfState ?? null);
  const [drinkingGamesState, setDrinkingGamesState] = useState<DrinkingGamesState | null>(restored?.drinkingGamesState ?? null);
  const [wordInfiltratorState, setWordInfiltratorState] = useState<WordInfiltratorState | null>(restored?.wordInfiltratorState ?? null);
  const [insiderGuessState, setInsiderGuessState] = useState<InsiderGuessState | null>(restored?.insiderGuessState ?? null);
  const [spyLocationState, setSpyLocationState] = useState<SpyLocationState | null>(restored?.spyLocationState ?? null);
  const [spectrumMeterState, setSpectrumMeterState] = useState<SpectrumMeterState | null>(restored?.spectrumMeterState ?? null);
  const [rankingAnswersState, setRankingAnswersState] = useState<RankingAnswersState | null>(restored?.rankingAnswersState ?? null);
  const [fakeArtistState, setFakeArtistState] = useState<FakeArtistState | null>(restored?.fakeArtistState ?? null);
  const [activeSession, setActiveSession] = useState<ActiveSessionRef | null>(restored?.activeSession ?? null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => savePlayers(players), [players]);
  useEffect(() => {
    const gameState = activeSession
      ? getActiveGameState(activeSession.gameId, {
          geoState,
          numberState,
          werewolfState,
          drinkingGamesState,
          wordInfiltratorState,
          insiderGuessState,
          spyLocationState,
          spectrumMeterState,
          rankingAnswersState,
          fakeArtistState
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
      geoConfig,
      numberConfig,
      werewolfConfig,
      drinkingGamesConfig,
      wordInfiltratorConfig,
      insiderGuessConfig,
      spyLocationConfig,
      spectrumMeterConfig,
      rankingAnswersConfig,
      fakeArtistConfig,
      activeSession
    } satisfies PersistedAppState);
  }, [
    screen,
    selectedGame,
    players,
    geoConfig,
    numberConfig,
    werewolfConfig,
    drinkingGamesConfig,
    wordInfiltratorConfig,
    insiderGuessConfig,
    spyLocationConfig,
    spectrumMeterConfig,
    rankingAnswersConfig,
    fakeArtistConfig,
    geoState,
    numberState,
    werewolfState,
    drinkingGamesState,
    wordInfiltratorState,
    insiderGuessState,
    spyLocationState,
    spectrumMeterState,
    rankingAnswersState,
    fakeArtistState,
    activeSession
  ]);

  const selectedSummary = selectedGame ? getGameDefinition(selectedGame) : null;

  function navigateHome() {
    clearGameSession(activeSession);
    setActiveSession(null);
    setGeoState(null);
    setNumberState(null);
    setWerewolfState(null);
    setDrinkingGamesState(null);
    setWordInfiltratorState(null);
    setInsiderGuessState(null);
    setSpyLocationState(null);
    setSpectrumMeterState(null);
    setRankingAnswersState(null);
    setFakeArtistState(null);
    setScreen("home");
    setSelectedGame(null);
    clearAppState();
  }

  function openSetup(gameId: GameId) {
    clearGameSession(activeSession);
    setActiveSession(null);
    setGeoState(null);
    setNumberState(null);
    setWerewolfState(null);
    setDrinkingGamesState(null);
    setWordInfiltratorState(null);
    setInsiderGuessState(null);
    setSpyLocationState(null);
    setSpectrumMeterState(null);
    setRankingAnswersState(null);
    setFakeArtistState(null);
    setSelectedGame(gameId);
    setScreen("setup");
  }

  async function startGame() {
    if (isStarting) return;
    setIsStarting(true);
    const seed = createSeed();
    try {
      if (!selectedGame) return;
      const nextSession = { sessionId: createSessionId(selectedGame), gameId: selectedGame };
      if (selectedGame === "geo") {
        const state = await getGameDefinition("geo").createState({ players, config: { ...geoConfig, rounds: 1 }, seed });
        setGeoState(state);
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
      if (selectedGame === "number-talk") {
        const state = await getGameDefinition("number-talk").createState({ players, config: numberConfig, seed });
        setNumberState(state);
        setGeoState(null);
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
        const state = await getGameDefinition("werewolf").createState({ players, config: werewolfConfig, seed });
        setWerewolfState(state);
        setGeoState(null);
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
        setGeoState(null);
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
        setGeoState(null);
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
        setGeoState(null);
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
        setGeoState(null);
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
        setGeoState(null);
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
        setGeoState(null);
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
        setGeoState(null);
        setNumberState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
        setWordInfiltratorState(null);
        setInsiderGuessState(null);
        setSpyLocationState(null);
        setSpectrumMeterState(null);
        setRankingAnswersState(null);
      }
      setActiveSession(nextSession);
      setScreen("game");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main className="app-shell">
      {screen === "home" && <HomeScreen onPlayers={() => setScreen("players")} onSelect={openSetup} />}
      {screen === "players" && <PlayerSetup players={players} setPlayers={setPlayers} onBack={navigateHome} />}
      {screen === "setup" && selectedSummary && (
        <SetupScreen
          game={selectedSummary}
          players={players}
          geoConfig={geoConfig}
          setGeoConfig={setGeoConfig}
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
      {screen === "game" && selectedGame === "geo" && geoState && (
        <GeoGame state={geoState} setState={setGeoState} players={players} onHome={navigateHome} onRestart={startGame} />
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
    </main>
  );
}

function isAddedTableGame(gameId: GameId): gameId is (typeof addedTableGameIds)[number] {
  return addedTableGameIds.includes(gameId as (typeof addedTableGameIds)[number]);
}

function Topbar(props: { title: string; eyebrow?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className={`topbar ${props.onBack ? "has-back" : ""}`}>
      {props.onBack && (
        <button className="icon-button back-button" type="button" onClick={props.onBack} aria-label="戻る">
          ‹
        </button>
      )}
      <div className="brand">
        <div className="mark" aria-hidden="true" />
        <div>
          <div className="eyebrow">{props.eyebrow ?? "Party Deck"}</div>
          <h1>{props.title}</h1>
        </div>
      </div>
      <div className="topbar-right">{props.right}</div>
    </header>
  );
}

function HomeScreen(props: { onPlayers: () => void; onSelect: (gameId: GameId) => void }) {
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
            <button key={game.id} className="game-card" type="button" onClick={() => props.onSelect(game.id)}>
              <span className="game-title">{game.title}</span>
              <span className="pill">
                {game.minPlayers}-{game.maxPlayers}人
              </span>
              <span className="game-description">{game.description}</span>
            </button>
          ))}
        </div>
        <AdSlot context="home" />
      </div>
    </section>
  );
}

function PlayerSetup(props: { players: Player[]; setPlayers: (players: Player[]) => void; onBack: () => void }) {
  function updatePlayer(id: string, patch: Partial<Player>) {
    props.setPlayers(props.players.map((player) => (player.id === id ? { ...player, ...patch } : player)));
  }

  function addPlayer() {
    if (props.players.length >= 8) return;
    const index = props.players.length + 1;
    props.setPlayers([
      ...props.players,
      { id: `p${index}-${Date.now().toString(36)}`, nickname: `ゲスト${index}`, color: PLAYER_COLORS[(index - 1) % PLAYER_COLORS.length] }
    ]);
  }

  function removePlayer(id: string) {
    if (props.players.length <= 2) return;
    props.setPlayers(props.players.filter((player) => player.id !== id));
  }

  return (
    <section className="screen">
      <Topbar title="プレイヤー" eyebrow="Setup" onBack={props.onBack} />
      <div className="content">
        {props.players.map((player) => (
          <div key={player.id} className="player-editor">
            <div className="player-row">
              <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
              <input value={player.nickname} maxLength={10} onChange={(event) => updatePlayer(player.id, { nickname: event.target.value })} />
              <button className="icon-button" type="button" onClick={() => removePlayer(player.id)} disabled={props.players.length <= 2}>
                ×
              </button>
            </div>
            <div className="swatches">
              {PLAYER_COLORS.map((color) => (
                <button
                  key={color}
                  className={`swatch ${player.color === color ? "selected" : ""}`}
                  style={{ "--swatch": color } as React.CSSProperties}
                  type="button"
                  onClick={() => updatePlayer(player.id, { color })}
                  aria-label={`色 ${color}`}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="actions">
          <button className="secondary" type="button" onClick={addPlayer} disabled={props.players.length >= 8}>
            追加
          </button>
          <button className="primary" type="button" onClick={props.onBack}>
            決定
          </button>
        </div>
        <AdSlot context="playerSetup" />
      </div>
    </section>
  );
}

function SetupScreen(props: {
  game: GameSummary;
  players: Player[];
  geoConfig: GeoConfig;
  setGeoConfig: (config: GeoConfig) => void;
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
  onBack: () => void;
  onStart: () => void;
  isStarting: boolean;
}) {
  const roleTargetCards = props.players.length + 2;
  const werewolfConfig: WerewolfConfig = {
    discussionTimeSec: props.werewolfConfig.discussionTimeSec === 300 ? 300 : 180,
    roleCounts: props.werewolfConfig.roleCounts ?? defaultRoleCounts(props.players.length)
  };
  const roleTotalCards = countRoleCards(werewolfConfig.roleCounts);
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
        {props.game.id === "geo" && (
          <>
            <RuleDetails
              title="ルール"
              summary="全員が同じ日本の地点画像を見て、地図にピンを刺します。"
              details={["1問で勝負します。", "地点移動はなしですが、画像は左右に動かして見られます。", "全員の回答後、正解地点と距離、点数を表示します。"]}
            />
            <SettingRow title="時間" detail="1人ごとの回答時間">
              <Segmented
                value={String(props.geoConfig.timeLimitSec)}
                options={["0", "60", "90"]}
                labels={{ "0": "なし", "60": "60", "90": "90" }}
                onChange={(value) => props.setGeoConfig({ ...props.geoConfig, timeLimitSec: Number(value) as 0 | 60 | 90 })}
              />
            </SettingRow>
          </>
        )}
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
                onChange={(value) => props.setNumberConfig({ ...props.numberConfig, topicCategory: value as NumberTalkCategory })}
              />
            </SettingRow>
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
              "同じゲームをAIが重複追加しないよう、別名、重複判定キー、参照元をデータに持たせています。"
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
              summary="親だけが0から100の正解位置を見て、みんなはヒントから位置を推理します。"
              details={[
                "親は左右の尺度と正解位置を見て、ちょうどよいヒントを出します。",
                "回答側は相談してスライダーを動かします。",
                "正解位置に近いほど高得点です。親を交代しながら複数回遊びます。"
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
            <SettingRow title="回数" detail="親を交代する回数">
              <Segmented
                value={String(props.spectrumMeterConfig.roundCount)}
                options={["3", "5"]}
                labels={{ "3": "3回", "5": "5回" }}
                onChange={(value) => props.setSpectrumMeterConfig({ ...props.spectrumMeterConfig, roundCount: Number(value) as 3 | 5 })}
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
                "公開した数字が前より小さくなった回数がミスです。5回以内なら成功です。"
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
              summary="1人だけお題を知らないまま、全員で1本ずつ線を描いて偽物を探します。"
              details={[
                "本物はカテゴリとお題を見ます。偽物はカテゴリだけを見ます。",
                "全員が2周、1本ずつ線を描きます。",
                "投票で偽物を見つけても、偽物がお題を当てたら偽物側の勝利です。"
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
        <Topbar title="数字確認" eyebrow="ナンバートーク" onBack={() => props.setState({ ...props.state, phase: "handoff" })} />
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
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="ナンバートーク" />
      <div className="content">
        <div className="topic">{success ? "成功" : "失敗"}</div>
        <div className="result-list">
          {props.state.order.map((playerId) => {
            const player = props.players.find((item) => item.id === playerId);
            if (!player) return null;
            return (
              <div key={player.id} className="result-row">
                <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                <strong>{player.nickname}</strong>
                <span className="score">{getNumberForPlayer(props.state, player.id)}</span>
              </div>
            );
          })}
        </div>
        <AdSlot context="result" />
        <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
      </div>
    </section>
  );
}

function GeoGame(props: {
  state: GeoState;
  setState: (state: GeoState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const location = currentGeoLocation(props.state);

  if (props.state.phase === "handoff") {
    return <PassDevice label="回答者" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "viewingImage" })} />;
  }

  if (props.state.phase === "viewingImage") {
    return (
      <section className="screen">
        <Topbar title="地点画像" eyebrow="日本マップGuessr" onBack={() => props.setState({ ...props.state, phase: "handoff" })} />
        <div className="content">
          <GeoImagePanel location={location} playerName={currentPlayer.nickname} />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "placingPin", pendingGuess: { lat: 36, lng: 138 } })}>
            地図を開く
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "placingPin") {
    return (
      <section className="screen">
        <Topbar title="回答する" eyebrow="日本マップGuessr" onBack={() => props.setState({ ...props.state, phase: "viewingImage" })} />
        <div className="content">
          <LeafletAnswerMap value={props.state.pendingGuess ?? { lat: 36, lng: 138 }} onChange={(pendingGuess) => props.setState({ ...props.state, pendingGuess })} />
          <button className="primary" type="button" onClick={() => submitGeoGuess(props.state, props.setState, props.players, currentPlayer.id, props.state.pendingGuess ?? { lat: 36, lng: 138 })}>
            回答を確定
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "roundResult") {
    const answers = roundAnswers(props.state);
    return (
      <section className="screen">
        <Topbar title="結果" eyebrow="日本マップGuessr" />
        <div className="content">
          <div className="topic">正解地点とみんなの回答</div>
          <LeafletResultMap location={location} answers={answers} players={props.players} />
          <GeoResultRows answers={answers} players={props.players} />
          <AdSlot context="result" />
          <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="日本マップGuessr" />
      <div className="content">
        <div className="result-list">
          {[...props.players]
            .sort((a, b) => totalGeoScore(props.state, b.id) - totalGeoScore(props.state, a.id))
            .map((player, index) => (
              <div key={player.id} className="result-row">
                <span className="rank">{index + 1}</span>
                <strong>{player.nickname}</strong>
                <span className="score">{totalGeoScore(props.state, player.id)}</span>
              </div>
            ))}
        </div>
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
          <div className="muted">{gamesToShow.length}件</div>
        </div>

        {gamesToShow.length === 0 ? (
          <div className="notice">条件に合うゲームがありません。</div>
        ) : (
          <div className="drink-game-list">
            {gamesToShow.map((game) => (
              <article key={game.id} className="drink-game-card">
                <div className="drink-game-head">
                  <div>
                    <h2>{game.title}</h2>
                    <p>{game.summary}</p>
                  </div>
                  <div className="card-pills">
                    {game.country && <span className="pill">{game.country}</span>}
                    {game.specialCategory && <span className="pill special-pill">{game.specialCategory}</span>}
                  </div>
                </div>
                <div className="drink-game-meta">
                  <span>{game.maxPlayers ? `${game.minPlayers}-${game.maxPlayers}人` : `${game.minPlayers}人以上`}</span>
                  <span>約{game.durationMin}分</span>
                  <span>道具なし</span>
                </div>
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
        <Topbar title="役職確認" eyebrow="ワンナイト人狼" onBack={() => props.setState({ ...props.state, phase: "roleHandoff" })} />
        <div className="content">
          <div className="role-card">
            <RoleSymbol roleId={role.roleId} />
            <h2>{role.name}</h2>
            <p>{role.description}</p>
            <div className="note role-note">
              <strong>できること</strong>
              <span>{role.actionSummary}</span>
              <span>{role.detail}</span>
            </div>
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
    return <PassDevice label="夜の行動" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "nightAction" })} />;
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
        return <NightScreen roleId={roleId} title="夜の行動" text={`${currentPlayer.nickname}だけ確認してください。`} result={result} onNext={advanceNight} />;
      }
      return (
        <section className="screen">
          <Topbar title="夜の行動" eyebrow="ワンナイト人狼" />
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
          title="夜の行動"
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
        return <NightScreen roleId={roleId} title="夜の行動" text={`${currentPlayer.nickname}だけ確認してください。`} result={result} onNext={advanceNight} />;
      }
      return (
        <section className="screen">
          <Topbar title="夜の行動" eyebrow="ワンナイト人狼" />
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

    return <NightScreen roleId={roleId} title="夜の行動" text={`${currentPlayer.nickname}の夜です。`} result={`${role.name}: ${role.actionSummary}`} onNext={advanceNight} />;
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
        <Topbar title="投票" eyebrow="ワンナイト人狼" onBack={() => props.setState({ ...props.state, phase: "voteHandoff" })} />
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
  const isLast = state.currentPlayerIndex >= players.length - 1;
  setState({
    ...state,
    currentPlayerIndex: isLast ? 0 : state.currentPlayerIndex + 1,
    phase: isLast ? "discussion" : "nightHandoff"
  });
}

function formatWerewolfVote(vote: WerewolfVote | undefined, players: Player[]) {
  if (!vote) return "未投票";
  if (vote.targetType === "peace") return "平和村";
  return players.find((player) => player.id === vote.targetPlayerId)?.nickname ?? "不明";
}

function submitGeoGuess(state: GeoState, setState: (state: GeoState) => void, players: Player[], playerId: string, guess: { lat: number; lng: number }) {
  const answer = createGeoAnswer(state, playerId, guess);
  const answers = [...state.answers, answer];
  const isLastPlayer = state.currentPlayerIndex >= players.length - 1;
  setState({
    ...state,
    answers,
    pendingGuess: undefined,
    currentPlayerIndex: isLastPlayer ? state.currentPlayerIndex : state.currentPlayerIndex + 1,
    phase: isLastPlayer ? "roundResult" : "handoff"
  });
}

function moveNumberOrder(state: NumberTalkState, setState: (state: NumberTalkState) => void, index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= state.order.length) return;
  const order = [...state.order];
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  setState({ ...state, order });
}

function LeafletAnswerMap(props: { value: { lat: number; lng: number }; onChange: (value: { lat: number; lng: number }) => void }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([36.2, 138.2], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    markerRef.current = L.marker([props.value.lat, props.value.lng], { icon: createLeafletPinIcon("#171717") }).addTo(map);
    map.on("click", (event) => {
      const next = { lat: event.latlng.lat, lng: event.latlng.lng };
      markerRef.current?.setLatLng(event.latlng);
      onChangeRef.current(next);
    });
    leafletRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      leafletRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    markerRef.current?.setLatLng([props.value.lat, props.value.lng]);
  }, [props.value.lat, props.value.lng]);

  return <div className="leaflet-panel" ref={mapRef} />;
}

function LeafletResultMap(props: { location: GeoState["roundLocations"][number]; answers: GeoAnswer[]; players: Player[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([props.location.lat, props.location.lng], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const points: L.LatLngExpression[] = [[props.location.lat, props.location.lng]];
    const correctLatLng: L.LatLngExpression = [props.location.lat, props.location.lng];
    L.marker(correctLatLng, { icon: createLeafletPinIcon("#0f8b8d", true) }).addTo(map).bindTooltip("正解地点", { permanent: true, direction: "top", offset: [0, -30] });
    props.answers.forEach((answer) => {
      const player = props.players.find((item) => item.id === answer.playerId);
      const guessLatLng: L.LatLngExpression = [answer.guessLat, answer.guessLng];
      points.push(guessLatLng);
      L.polyline([correctLatLng, guessLatLng], {
        color: player?.color ?? "#171717",
        weight: 3,
        opacity: 0.72,
        dashArray: "6 6"
      }).addTo(map);
      L.marker(guessLatLng, { icon: createLeafletPinIcon(player?.color ?? "#171717") }).addTo(map).bindTooltip(player?.nickname ?? "回答", { direction: "bottom", offset: [0, 10] });
    });
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 8 });
    leafletRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  return <div className="leaflet-panel" ref={mapRef} />;
}

function createLeafletPinIcon(color: string, isCorrect = false) {
  const className = isCorrect ? "map-pin correct" : "map-pin";
  return L.divIcon({
    className: "map-pin-wrapper",
    html: `<span class="${className}" style="--pin-color:${color}"></span>`,
    iconSize: [26, 32],
    iconAnchor: [13, 32]
  });
}

function GeoResultRows(props: { answers: GeoAnswer[]; players: Player[] }) {
  return (
    <div className="result-list">
      {props.answers
        .map((answer) => ({ answer, player: props.players.find((player) => player.id === answer.playerId) }))
        .filter((item): item is { answer: GeoAnswer; player: Player } => Boolean(item.player))
        .sort((a, b) => b.answer.score - a.answer.score)
        .map(({ answer, player }) => (
          <div key={player.id} className="result-row">
            <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
            <strong>{player.nickname}</strong>
            <span className="score">
              {answer.score}
              <small>{formatDistance(answer.distanceMeters)}</small>
            </span>
          </div>
        ))}
    </div>
  );
}

function GeoImagePanel(props: { location: GeoState["roundLocations"][number]; playerName: string }) {
  const [result, setResult] = useState<StreetImageLoadResult | { status: "loading" }>({ status: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading" });
    loadMapillaryStreetImage(props.location).then((nextResult) => {
      if (!cancelled) setResult(nextResult);
    });
    return () => {
      cancelled = true;
    };
  }, [props.location.id, retryCount]);

  const isReady = result.status === "ready";
  const image = isReady ? result.image : null;
  const copy = getStreetImageCopy(result, props.location);

  return (
    <div className={`street-view ${isReady ? "has-image" : ""}`}>
      {image && <PannableStreetImage src={image.imageUrl} />}
      <div className="street-hud">
        <span>{props.playerName}</span>
      </div>
      <div className="street-copy">
        <strong>{copy.title}</strong>
        <span>{copy.detail}</span>
        {image ? (
          <a href={image.sourceUrl} target="_blank" rel="noreferrer">
            {image.attribution}
          </a>
        ) : (
          <span>{copy.message}</span>
        )}
        {"retryable" in result && result.retryable && (
          <button className="inline-action" type="button" onClick={() => setRetryCount((count) => count + 1)}>
            再試行
          </button>
        )}
      </div>
    </div>
  );
}

function PannableStreetImage(props: { src: string }) {
  const [offset, setOffset] = useState(0);
  const dragRef = useRef<{ startX: number; startOffset: number } | null>(null);

  function clampOffset(value: number) {
    return Math.max(-22, Math.min(22, value));
  }

  return (
    <div
      className="street-image-pan"
      onPointerDown={(event) => {
        dragRef.current = { startX: event.clientX, startOffset: offset };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return;
        const delta = ((event.clientX - dragRef.current.startX) / Math.max(1, event.currentTarget.clientWidth)) * 100;
        setOffset(clampOffset(dragRef.current.startOffset + delta));
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    >
      <img className="street-image" src={props.src} alt="Mapillary street-level imagery" style={{ transform: `translateX(${offset}%)` }} draggable={false} />
      <span className="pan-hint">ドラッグで左右を見る</span>
    </div>
  );
}

function getStreetImageCopy(result: StreetImageLoadResult | { status: "loading" }, location: GeoState["roundLocations"][number]) {
  const place = `${location.prefecture ?? location.region ?? "日本"} / ${location.tags.join(", ")}`;
  if (result.status === "loading") {
    return { title: "Mapillary image", detail: place, message: "画像を読み込み中です。" };
  }
  if (result.status === "ready") {
    return { title: "Mapillary image", detail: place, message: "" };
  }
  return { title: "Mapillary image", detail: place, message: result.message };
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function PassDevice(props: { label: string; player: Player; onConfirm: () => void }) {
  return (
    <section className="pass-screen">
      <div className="pass-card" style={{ "--player-color": props.player.color } as React.CSSProperties}>
        <span className="pass-sub">{props.label}</span>
        <strong className="pass-name">{props.player.nickname}</strong>
        <button className="primary" type="button" onClick={props.onConfirm}>
          画面を見る
        </button>
      </div>
    </section>
  );
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

function FinalResultActions(props: { onRestart: () => void | Promise<void>; onHome: () => void }) {
  return (
    <div className="actions">
      <button className="primary" type="button" onClick={() => void props.onRestart()}>
        もう一度
      </button>
      <button className="secondary" type="button" onClick={props.onHome}>
        ゲーム一覧へ
      </button>
    </div>
  );
}

function RoleSymbol(props: { roleId: RoleId }) {
  const role = roleDefinitions[props.roleId];
  return (
    <div className={`role-symbol role-symbol-${props.roleId}`} aria-hidden="true">
      {role.icon}
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
        {role.name}: {role.actionSummary}
      </p>
    </div>
  );
}

function PlayerStrip(props: { players: Player[] }) {
  return (
    <div className="players-strip">
      {props.players.map((player) => (
        <span key={player.id} className="player-chip">
          <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
          {player.nickname}
        </span>
      ))}
    </div>
  );
}

function PlayerOrder(props: { playerIds: string[]; players: Player[] }) {
  return (
    <div className="order-list">
      {props.playerIds.map((playerId, index) => {
        const player = props.players.find((item) => item.id === playerId);
        if (!player) return null;
        return (
          <div key={player.id} className="order-item simple-order-item">
            <span className="rank">{index + 1}</span>
            <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
            <strong>{player.nickname}</strong>
          </div>
        );
      })}
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

function RoleCountEditor(props: { counts: RoleCounts; targetCards: number; onChange: (counts: RoleCounts) => void }) {
  const total = countRoleCards(props.counts);
  function changeRoleCount(roleId: RoleId, delta: -1 | 1) {
    const next = { ...props.counts, [roleId]: Math.max(0, props.counts[roleId] + delta) };
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
                <button type="button" onClick={() => changeRoleCount(roleId, -1)} disabled={props.counts[roleId] <= 0}>
                  −
                </button>
                <strong>{props.counts[roleId]}</strong>
                <button type="button" onClick={() => changeRoleCount(roleId, 1)} disabled={total >= props.targetCards}>
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

function AdSlot(props: { context: Parameters<typeof canShowAds>[0] }) {
  if (!canShowAds(props.context)) return null;
  return <div className="ad-slot">広告エリア</div>;
}

function restorePersistedAppState(): RestoredAppState | null {
  const persisted = sanitizePersistedAppState(loadAppState<PersistedAppState>());
  if (!persisted) return null;

  let geoState: GeoState | null = null;
  let numberState: NumberTalkState | null = null;
  let werewolfState: WerewolfState | null = null;
  let drinkingGamesState: DrinkingGamesState | null = null;
  let wordInfiltratorState: WordInfiltratorState | null = null;
  let insiderGuessState: InsiderGuessState | null = null;
  let spyLocationState: SpyLocationState | null = null;
  let spectrumMeterState: SpectrumMeterState | null = null;
  let rankingAnswersState: RankingAnswersState | null = null;
  let fakeArtistState: FakeArtistState | null = null;

  if (persisted.activeSession?.gameId === "geo") {
    geoState = sanitizeLoadedGeoState(loadGameSession<GeoState>(persisted.activeSession.sessionId, "geo")?.state ?? null);
  }
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

  const hasActiveState = Boolean(geoState ?? numberState ?? werewolfState ?? drinkingGamesState ?? wordInfiltratorState ?? insiderGuessState ?? spyLocationState ?? spectrumMeterState ?? rankingAnswersState ?? fakeArtistState);
  if (persisted.screen === "game" && !hasActiveState) {
    persisted.screen = "home";
    persisted.selectedGame = null;
    persisted.activeSession = null;
  }

  return {
    ...persisted,
    geoState,
    numberState,
    werewolfState,
    drinkingGamesState,
    wordInfiltratorState,
    insiderGuessState,
    spyLocationState,
    spectrumMeterState,
    rankingAnswersState,
    fakeArtistState
  };
}

function getActiveGameState(
  gameId: GameId,
  states: {
    geoState: GeoState | null;
    numberState: NumberTalkState | null;
    werewolfState: WerewolfState | null;
    drinkingGamesState: DrinkingGamesState | null;
    wordInfiltratorState: WordInfiltratorState | null;
    insiderGuessState: InsiderGuessState | null;
    spyLocationState: SpyLocationState | null;
    spectrumMeterState: SpectrumMeterState | null;
    rankingAnswersState: RankingAnswersState | null;
    fakeArtistState: FakeArtistState | null;
  }
) {
  if (gameId === "geo") return states.geoState;
  if (gameId === "number-talk") return states.numberState;
  if (gameId === "werewolf") return states.werewolfState;
  if (gameId === "drinking-games") return states.drinkingGamesState;
  if (gameId === "word-infiltrator") return states.wordInfiltratorState;
  if (gameId === "insider-guess") return states.insiderGuessState;
  if (gameId === "spy-location") return states.spyLocationState;
  if (gameId === "spectrum-meter") return states.spectrumMeterState;
  if (gameId === "ranking-answers") return states.rankingAnswersState;
  return states.fakeArtistState;
}

function sanitizePersistedAppState(state: PersistedAppState | null): PersistedAppState | null {
  if (!state) return null;
  const next = structuredClone(state);

  next.activeSession = next.activeSession ?? null;
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
  return sanitizeReloadPhase(
    state,
    {
      roleReveal: "roleHandoff",
      vote: "voteHandoff"
    },
    [{ prefix: "night", fallback: "nightHandoff" }]
  );
}

function sanitizeLoadedGeoState(state: GeoState | null): GeoState | null {
  if (!state) return null;
  const next = sanitizeReloadPhase(state, {
    placingPin: "viewingImage",
    confirmGuess: "viewingImage"
  });
  if (next && (state.phase === "placingPin" || state.phase === "confirmGuess")) {
    next.pendingGuess = undefined;
  }
  return next;
}

function sanitizeLoadedDrinkingGamesState(state: DrinkingGamesState | null): DrinkingGamesState | null {
  if (!state) return null;
  const next = structuredClone(state);
  next.phase = "browse";
  next.country = next.country ?? "all";
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
  return sanitizeReloadPhase(state, {
    revealSecret: "handoff",
    vote: "voteHandoff"
  });
}
