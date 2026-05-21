import L from "leaflet";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountdownTimer } from "./components/CountdownTimer";
import { canShowAds } from "./core/adPolicy";
import { games, getGameDefinition } from "./core/gameRegistry";
import { createSeed } from "./core/random";
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
import { loadMapillaryStreetImage, type StreetImageLoadResult } from "./games/mapillaryProvider";

type Screen = "home" | "players" | "setup" | "game";

type PersistedAppState = {
  screen: Screen;
  selectedGame: GameId | null;
  players: Player[];
  geoConfig: GeoConfig;
  numberConfig: NumberTalkConfig;
  werewolfConfig: WerewolfConfig;
  drinkingGamesConfig: DrinkingGamesConfig;
  activeSession: ActiveSessionRef | null;
};

type RestoredAppState = PersistedAppState & {
  geoState: GeoState | null;
  numberState: NumberTalkState | null;
  werewolfState: WerewolfState | null;
  drinkingGamesState: DrinkingGamesState | null;
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
  const [geoState, setGeoState] = useState<GeoState | null>(restored?.geoState ?? null);
  const [numberState, setNumberState] = useState<NumberTalkState | null>(restored?.numberState ?? null);
  const [werewolfState, setWerewolfState] = useState<WerewolfState | null>(restored?.werewolfState ?? null);
  const [drinkingGamesState, setDrinkingGamesState] = useState<DrinkingGamesState | null>(restored?.drinkingGamesState ?? null);
  const [activeSession, setActiveSession] = useState<ActiveSessionRef | null>(restored?.activeSession ?? null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => savePlayers(players), [players]);
  useEffect(() => {
    const gameState = activeSession
      ? getActiveGameState(activeSession.gameId, {
          geoState,
          numberState,
          werewolfState,
          drinkingGamesState
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
      activeSession
    } satisfies PersistedAppState);
  }, [screen, selectedGame, players, geoConfig, numberConfig, werewolfConfig, drinkingGamesConfig, geoState, numberState, werewolfState, drinkingGamesState, activeSession]);

  const selectedSummary = selectedGame ? getGameDefinition(selectedGame) : null;

  function navigateHome() {
    clearGameSession(activeSession);
    setActiveSession(null);
    setGeoState(null);
    setNumberState(null);
    setWerewolfState(null);
    setDrinkingGamesState(null);
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
      }
      if (selectedGame === "number-talk") {
        const state = await getGameDefinition("number-talk").createState({ players, config: numberConfig, seed });
        setNumberState(state);
        setGeoState(null);
        setWerewolfState(null);
        setDrinkingGamesState(null);
      }
      if (selectedGame === "werewolf") {
        const state = await getGameDefinition("werewolf").createState({ players, config: werewolfConfig, seed });
        setWerewolfState(state);
        setGeoState(null);
        setNumberState(null);
        setDrinkingGamesState(null);
      }
      if (selectedGame === "drinking-games") {
        const state = await getGameDefinition("drinking-games").createState({ players, config: drinkingGamesConfig, seed });
        setDrinkingGamesState(state);
        setGeoState(null);
        setNumberState(null);
        setWerewolfState(null);
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
    </main>
  );
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
          <div className="filter-row" role="group" aria-label="国で絞り込み">
            <button type="button" className={props.state.country === "all" ? "active" : ""} onClick={() => props.setState({ ...props.state, country: "all" })}>
              すべて
            </button>
            {countries.map((country) => (
              <button key={country} type="button" className={props.state.country === country ? "active" : ""} onClick={() => props.setState({ ...props.state, country })}>
                {country}
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
                  {game.country && <span className="pill">{game.country}</span>}
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

function Note(props: { title: string; text: string }) {
  return (
    <div className="note">
      <strong>{props.title}</strong>
      <span>{props.text}</span>
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

  const hasActiveState = Boolean(geoState ?? numberState ?? werewolfState ?? drinkingGamesState);
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
    drinkingGamesState
  };
}

function getActiveGameState(
  gameId: GameId,
  states: { geoState: GeoState | null; numberState: NumberTalkState | null; werewolfState: WerewolfState | null; drinkingGamesState: DrinkingGamesState | null }
) {
  if (gameId === "geo") return states.geoState;
  if (gameId === "number-talk") return states.numberState;
  if (gameId === "werewolf") return states.werewolfState;
  return states.drinkingGamesState;
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
  if (!state) return null;
  const next = structuredClone(state);
  if (next.phase === "revealNumber") {
    next.phase = "handoff";
  }
  if (next.phase === "confirmOrder") {
    next.phase = "ordering";
  }
  return next;
}

function sanitizeLoadedWerewolfState(state: WerewolfState | null): WerewolfState | null {
  if (!state) return null;
  const next = structuredClone(state);
  if (next.phase === "roleReveal") {
    next.phase = "roleHandoff";
  }
  if (next.phase === "vote") {
    next.phase = "voteHandoff";
  }
  const phase = next.phase as string;
  if (phase.startsWith("night")) {
    next.phase = "nightHandoff";
  }
  return next;
}

function sanitizeLoadedGeoState(state: GeoState | null): GeoState | null {
  if (!state) return null;
  const next = structuredClone(state);
  if (next.phase === "placingPin" || next.phase === "confirmGuess") {
    next.phase = "viewingImage";
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
