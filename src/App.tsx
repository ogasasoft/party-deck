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
  defaultWerewolfConfig,
  getNightAction,
  judgeWerewolf,
  nextWerewolfNightPhase,
  playerWithRole,
  playersWithRole,
  recordWerewolfAction,
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
  activeSession: ActiveSessionRef | null;
};

type RestoredAppState = PersistedAppState & {
  geoState: GeoState | null;
  numberState: NumberTalkState | null;
  werewolfState: WerewolfState | null;
};

export function App() {
  const restored = useMemo(() => restorePersistedAppState(), []);
  const [screen, setScreen] = useState<Screen>(restored?.screen ?? "home");
  const [selectedGame, setSelectedGame] = useState<GameId | null>(restored?.selectedGame ?? null);
  const [players, setPlayers] = useState<Player[]>(() => restored?.players ?? loadPlayers());
  const [geoConfig, setGeoConfig] = useState<GeoConfig>(() => restored?.geoConfig ?? defaultGeoConfig());
  const [numberConfig, setNumberConfig] = useState<NumberTalkConfig>(() => restored?.numberConfig ?? defaultNumberTalkConfig());
  const [werewolfConfig, setWerewolfConfig] = useState<WerewolfConfig>(() => restored?.werewolfConfig ?? defaultWerewolfConfig());
  const [geoState, setGeoState] = useState<GeoState | null>(restored?.geoState ?? null);
  const [numberState, setNumberState] = useState<NumberTalkState | null>(restored?.numberState ?? null);
  const [werewolfState, setWerewolfState] = useState<WerewolfState | null>(restored?.werewolfState ?? null);
  const [activeSession, setActiveSession] = useState<ActiveSessionRef | null>(restored?.activeSession ?? null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => savePlayers(players), [players]);
  useEffect(() => {
    const gameState = activeSession
      ? getActiveGameState(activeSession.gameId, {
          geoState,
          numberState,
          werewolfState
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
      activeSession
    } satisfies PersistedAppState);
  }, [screen, selectedGame, players, geoConfig, numberConfig, werewolfConfig, geoState, numberState, werewolfState, activeSession]);

  const selectedSummary = selectedGame ? getGameDefinition(selectedGame) : null;

  function navigateHome() {
    clearGameSession(activeSession);
    setActiveSession(null);
    setGeoState(null);
    setNumberState(null);
    setWerewolfState(null);
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
        const state = await getGameDefinition("geo").createState({ players, config: geoConfig, seed });
        setGeoState(state);
        setNumberState(null);
        setWerewolfState(null);
      }
      if (selectedGame === "number-talk") {
        const state = await getGameDefinition("number-talk").createState({ players, config: numberConfig, seed });
        setNumberState(state);
        setGeoState(null);
        setWerewolfState(null);
      }
      if (selectedGame === "werewolf") {
        const state = await getGameDefinition("werewolf").createState({ players, config: werewolfConfig, seed });
        setWerewolfState(state);
        setGeoState(null);
        setNumberState(null);
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
        <NumberTalkGame state={numberState} setState={setNumberState} players={players} onHome={navigateHome} />
      )}
      {screen === "game" && selectedGame === "werewolf" && werewolfState && (
        <WerewolfGame state={werewolfState} setState={setWerewolfState} players={players} onHome={navigateHome} />
      )}
      {screen === "game" && selectedGame === "geo" && geoState && (
        <GeoGame state={geoState} setState={setGeoState} players={players} onHome={navigateHome} />
      )}
    </main>
  );
}

function Topbar(props: { title: string; eyebrow?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="mark" aria-hidden="true" />
        <div>
          <div className="eyebrow">{props.eyebrow ?? "Party Deck"}</div>
          <h1>{props.title}</h1>
        </div>
      </div>
      {props.onBack ? (
        <button className="icon-button" type="button" onClick={props.onBack} aria-label="戻る">
          ‹
        </button>
      ) : (
        props.right
      )}
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
  const canStart = props.players.length >= props.game.minPlayers && props.players.length <= props.game.maxPlayers;

  return (
    <section className="screen">
      <Topbar title={props.game.title} eyebrow="Game Setup" onBack={props.onBack} />
      <div className="content">
        <PlayerStrip players={props.players} />
        {!canStart && <div className="notice">{props.game.minPlayers}人以上で開始できます。</div>}
        {props.game.id === "geo" && (
          <>
            <SettingRow title="ラウンド" detail="全員が同じ地点を回答">
              <Segmented
                value={String(props.geoConfig.rounds)}
                options={["3", "5"]}
                onChange={(value) => props.setGeoConfig({ ...props.geoConfig, rounds: Number(value) as 3 | 5 })}
              />
            </SettingRow>
            <SettingRow title="時間" detail="1人ごとの回答時間">
              <Segmented
                value={String(props.geoConfig.timeLimitSec)}
                options={["0", "60", "90"]}
                labels={{ "0": "なし", "60": "60", "90": "90" }}
                onChange={(value) => props.setGeoConfig({ ...props.geoConfig, timeLimitSec: Number(value) as 0 | 60 | 90 })}
              />
            </SettingRow>
            <Note title="出題地点は自動選択" text="全員が同じ地点を順番に回答します。移動なし固定の画像で遊びます。" />
          </>
        )}
        {props.game.id === "number-talk" && (
          <>
            <SettingRow title="お題" detail="カテゴリを選択">
              <Segmented
                value={props.numberConfig.topicCategory}
                options={["normal", "twist", "love"]}
                labels={{ normal: "通常", twist: "変化球", love: "恋愛" }}
                onChange={(value) => props.setNumberConfig({ ...props.numberConfig, topicCategory: value as NumberTalkCategory })}
              />
            </SettingRow>
            <SettingRow title="会話" detail="数字を直接言わない">
              <Segmented
                value={String(props.numberConfig.discussionTimeSec)}
                options={["180", "300"]}
                labels={{ "180": "3分", "300": "5分" }}
                onChange={(value) => props.setNumberConfig({ ...props.numberConfig, discussionTimeSec: Number(value) as 180 | 300 })}
              />
            </SettingRow>
            <Note title="数字は1-100固定、手札は1人1枚" text="各プレイヤーは自分の数字だけを確認して会話します。" />
          </>
        )}
        {props.game.id === "werewolf" && (
          <>
            <div className="topic">使用カードはプレイヤー数+2枚</div>
            <SettingRow title="議論" detail="投票前の会話時間">
              <Segmented
                value={String(props.werewolfConfig.discussionTimeSec)}
                options={["180", "300"]}
                labels={{ "180": "3分", "300": "5分" }}
                onChange={(value) => props.setWerewolfConfig({ ...props.werewolfConfig, discussionTimeSec: Number(value) as 180 | 300 })}
              />
            </SettingRow>
            <Note title="基本役職" text="村人、人狼、占い師、怪盗で開始します。" />
          </>
        )}
        <button className="primary" type="button" onClick={props.onStart} disabled={!canStart || props.isStarting}>
          {props.isStarting ? "準備中..." : "はじめる"}
        </button>
        <AdSlot context="gameSetup" />
      </div>
    </section>
  );
}

function NumberTalkGame(props: { state: NumberTalkState; setState: (state: NumberTalkState) => void; players: Player[]; onHome: () => void }) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];

  if (props.state.phase === "handoff") {
    return <PassDevice label="数字確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "revealNumber" })} onHome={props.onHome} />;
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
        <Topbar title="会話" eyebrow="ナンバートーク" onBack={props.onHome} />
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
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "confirmOrder" })}>
            公開確認へ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "confirmOrder") {
    const orderPlayers = props.state.order.map((id) => props.players.find((player) => player.id === id)).filter(Boolean) as Player[];
    return (
      <section className="screen">
        <Topbar title="公開確認" eyebrow="ナンバートーク" onBack={() => props.setState({ ...props.state, phase: "ordering" })} />
        <div className="content">
          <div className="topic">この順番で数字を公開しますか？</div>
          <div className="note">
            <strong>{props.state.topic.text}</strong>
            <span>
              {props.state.topic.lowLabel ?? "小さい"} → {props.state.topic.highLabel ?? "大きい"}
            </span>
          </div>
          <div className="result-list">
            {orderPlayers.map((player, index) => (
              <div key={player.id} className="result-row">
                <span className="rank">{index + 1}</span>
                <strong>{player.nickname}</strong>
                <span className="muted">未公開</span>
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="secondary" type="button" onClick={() => props.setState({ ...props.state, phase: "ordering" })}>
              修正する
            </button>
            <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "result" })}>
              公開する
            </button>
          </div>
        </div>
      </section>
    );
  }

  const success = isNumberOrderCorrect(props.state);
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="ナンバートーク" onBack={props.onHome} />
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
        <button className="primary" type="button" onClick={props.onHome}>
          ゲーム一覧へ
        </button>
      </div>
    </section>
  );
}

function GeoGame(props: { state: GeoState; setState: (state: GeoState) => void; players: Player[]; onHome: () => void }) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const location = currentGeoLocation(props.state);

  if (props.state.phase === "handoff") {
    return <PassDevice label={`ラウンド ${props.state.currentRoundIndex + 1}`} player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "viewingImage" })} onHome={props.onHome} />;
  }

  if (props.state.phase === "viewingImage") {
    return (
      <section className="screen">
        <Topbar title={`ラウンド ${props.state.currentRoundIndex + 1}`} eyebrow="日本マップGuessr" onBack={props.onHome} />
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
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "confirmGuess", pendingGuess: props.state.pendingGuess ?? { lat: 36, lng: 138 } })}>
            回答確認へ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "confirmGuess") {
    const guess = props.state.pendingGuess ?? { lat: 36, lng: 138 };
    return (
      <section className="screen">
        <Topbar title="回答確認" eyebrow="日本マップGuessr" onBack={() => props.setState({ ...props.state, phase: "placingPin" })} />
        <div className="content">
          <div className="topic">この場所で回答しますか？</div>
          <LeafletPinPreviewMap value={guess} />
          <div className="actions">
            <button className="secondary" type="button" onClick={() => props.setState({ ...props.state, phase: "placingPin" })}>
              修正する
            </button>
            <button className="primary" type="button" onClick={() => submitGeoGuess(props.state, props.setState, props.players, currentPlayer.id, guess)}>
              確定する
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (props.state.phase === "roundResult") {
    const answers = roundAnswers(props.state);
    return (
      <section className="screen">
        <Topbar title="ラウンド結果" eyebrow="日本マップGuessr" onBack={props.onHome} />
        <div className="content">
          <div className="topic">正解: {location.prefecture ?? "日本"}付近</div>
          <LeafletResultMap location={location} answers={answers} players={props.players} />
          <GeoResultRows answers={answers} players={props.players} />
          <AdSlot context="result" />
          <button
            className="primary"
            type="button"
            onClick={() => {
              const isLastRound = props.state.currentRoundIndex >= props.state.config.rounds - 1;
              props.setState({
                ...props.state,
                phase: isLastRound ? "gameResult" : "handoff",
                currentRoundIndex: isLastRound ? props.state.currentRoundIndex : props.state.currentRoundIndex + 1,
                currentPlayerIndex: 0
              });
            }}
          >
            {props.state.currentRoundIndex >= props.state.config.rounds - 1 ? "最終結果へ" : "次のラウンドへ"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <Topbar title="最終結果" eyebrow="日本マップGuessr" onBack={props.onHome} />
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
        <button className="primary" type="button" onClick={props.onHome}>
          ゲーム一覧へ
        </button>
      </div>
    </section>
  );
}

function WerewolfGame(props: { state: WerewolfState; setState: (state: WerewolfState) => void; players: Player[]; onHome: () => void }) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];

  if (props.state.phase === "roleHandoff") {
    return <PassDevice label="役職確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "roleReveal" })} onHome={props.onHome} />;
  }

  if (props.state.phase === "roleReveal") {
    const role = roleDefinitions[props.state.playerInitialCards[currentPlayer.id]];
    return (
      <section className="screen">
        <Topbar title="役職確認" eyebrow="ワンナイト人狼" onBack={() => props.setState({ ...props.state, phase: "roleHandoff" })} />
        <div className="content">
          <div className="role-card">
            <div className="role-symbol">{role.name.slice(0, 1)}</div>
            <h2>{role.name}</h2>
            <p>{role.description}</p>
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
              props.setState({ ...nextState, phase: isLast ? nextWerewolfNightPhase(nextState, props.players, "roles") : "roleHandoff" });
            }}
          >
            隠して渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "nightSeerHandoff") {
    const seer = playerWithRole(props.state, props.players, "seer");
    if (!seer) {
      return <NightScreen title="占い師" text="占い師は場にいません。" onNext={() => props.setState({ ...props.state, phase: nextWerewolfNightPhase(props.state, props.players, "seer") })} />;
    }
    return <NightPassScreen title="占い師" name={seer.nickname} color={seer.color} onConfirm={() => props.setState({ ...props.state, phase: "nightSeer" })} onHome={props.onHome} />;
  }

  if (props.state.phase === "nightSeer") {
    const seer = playerWithRole(props.state, props.players, "seer");
    const action = getNightAction(props.state, "seer");
    if (!seer) {
      return <NightScreen title="占い師" text="占い師は場にいません。" onNext={() => props.setState({ ...props.state, phase: nextWerewolfNightPhase(props.state, props.players, "seer") })} />;
    }
    if (action) {
      const target = action.mode === "player" ? props.players.find((player) => player.id === action.targetPlayerId) : null;
      const result =
        action.mode === "center"
          ? `中央: ${(action.seenCenterCards ?? props.state.centerCards).map((roleId) => roleDefinitions[roleId].name).join(" / ")}`
          : `${target?.nickname ?? "選択したプレイヤー"}: ${roleDefinitions[action.seenRole ?? "villager"].name}`;
      return (
        <NightScreen
          title="占い師の結果"
          text={`${seer.nickname}だけ確認してください。`}
          result={result}
          onNext={() => props.setState({ ...props.state, phase: nextWerewolfNightPhase(props.state, props.players, "seer") })}
        />
      );
    }
    return (
      <section className="screen">
        <Topbar title="占い師" eyebrow="ワンナイト人狼" />
        <div className="content">
          <div className="topic">{seer.nickname}の夜行動</div>
          <div className="vote-grid">
            <button
              className="vote-button"
              type="button"
              onClick={() => {
                const next = structuredClone(props.state);
                applySeerAction(next, seer.id, { mode: "center" });
                props.setState(next);
              }}
            >
              中央2枚を見る
            </button>
            {props.players
              .filter((player) => player.id !== seer.id)
              .map((player) => (
                <button
                  key={player.id}
                  className="vote-button"
                  type="button"
                  onClick={() => {
                    const next = structuredClone(props.state);
                    applySeerAction(next, seer.id, { mode: "player", targetPlayerId: player.id });
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

  if (props.state.phase === "nightWerewolfHandoff") {
    const wolves = playersWithRole(props.state, props.players, "werewolf");
    if (wolves.length === 0) {
      return <NightScreen title="人狼" text="人狼は場にいません。" onNext={() => props.setState({ ...props.state, phase: nextWerewolfNightPhase(props.state, props.players, "werewolf") })} />;
    }
    return <NightPassScreen title="人狼" name="人狼の人" color="#d64545" onConfirm={() => props.setState({ ...props.state, phase: "nightWerewolf" })} onHome={props.onHome} />;
  }

  if (props.state.phase === "nightWerewolf") {
    const wolves = playersWithRole(props.state, props.players, "werewolf");
    const result = wolves.length > 1 ? `人狼: ${wolves.map((wolf) => wolf.nickname).join(" / ")}` : `${wolves[0]?.nickname ?? "人狼"}は単独です。`;
    return (
      <NightScreen
        title="人狼"
        text="人狼の人だけ確認してください。"
        result={result}
        onNext={() => {
          const next = structuredClone(props.state);
          recordWerewolfAction(next, props.players);
          props.setState({ ...next, phase: nextWerewolfNightPhase(next, props.players, "werewolf") });
        }}
      />
    );
  }

  if (props.state.phase === "nightRobberHandoff") {
    const robber = playerWithRole(props.state, props.players, "robber");
    if (!robber) {
      return <NightScreen title="怪盗" text="怪盗は場にいません。" onNext={() => props.setState({ ...props.state, phase: "discussion" })} />;
    }
    return <NightPassScreen title="怪盗" name={robber.nickname} color={robber.color} onConfirm={() => props.setState({ ...props.state, phase: "nightRobber" })} onHome={props.onHome} />;
  }

  if (props.state.phase === "nightRobber") {
    const robber = playerWithRole(props.state, props.players, "robber");
    return (
      <section className="screen">
        <Topbar title="怪盗" eyebrow="ワンナイト人狼" />
        <div className="content">
          <div className="topic">{robber ? `${robber.nickname}の夜行動` : "怪盗は場にいません。"}</div>
          {robber ? (
            <div className="vote-grid">
              {props.players
                .filter((player) => player.id !== robber.id)
                .map((player) => (
                  <button
                    key={player.id}
                    className="vote-button"
                    type="button"
                    onClick={() => {
                      const next = structuredClone(props.state);
                      applyRobberAction(next, robber.id, player.id);
                      props.setState({ ...next, phase: "nightRobberResult" });
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
                  applyRobberAction(next, robber.id);
                  props.setState({ ...next, phase: "nightRobberResult" });
                }}
              >
                交換しない
              </button>
            </div>
          ) : (
            <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "discussion" })}>
              議論へ
            </button>
          )}
        </div>
      </section>
    );
  }

  if (props.state.phase === "nightRobberResult") {
    const action = getNightAction(props.state, "robber");
    const robber = props.players.find((player) => player.id === action?.actorId);
    const target = props.players.find((player) => player.id === action?.targetPlayerId);
    const result = action?.skipped ? `今の役職: ${roleDefinitions[action.newRole ?? "robber"].name}` : `${target?.nickname ?? "選択したプレイヤー"}と交換 / 今の役職: ${roleDefinitions[action?.newRole ?? "villager"].name}`;
    return <NightScreen title="怪盗の結果" text={`${robber?.nickname ?? "怪盗"}だけ確認してください。`} result={result} onNext={() => props.setState({ ...props.state, phase: "discussion" })} />;
  }

  if (props.state.phase === "discussion") {
    return (
      <section className="screen">
        <Topbar title="議論" eyebrow="ワンナイト人狼" onBack={props.onHome} />
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
    return <PassDevice label="投票" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "vote" })} onHome={props.onHome} />;
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
      <Topbar title="結果" eyebrow="ワンナイト人狼" onBack={props.onHome} />
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
        <button className="primary" type="button" onClick={props.onHome}>
          ゲーム一覧へ
        </button>
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

function LeafletPinPreviewMap(props: { value: { lat: number; lng: number } }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false }).setView([props.value.lat, props.value.lng], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    L.marker([props.value.lat, props.value.lng], { icon: createLeafletPinIcon("#171717") }).addTo(map);
    leafletRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  return <div className="leaflet-panel compact" ref={mapRef} />;
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
    L.marker([props.location.lat, props.location.lng], { icon: createLeafletPinIcon("#0f8b8d", true) }).addTo(map);
    props.answers.forEach((answer) => {
      const player = props.players.find((item) => item.id === answer.playerId);
      points.push([answer.guessLat, answer.guessLng]);
      L.marker([answer.guessLat, answer.guessLng], { icon: createLeafletPinIcon(player?.color ?? "#171717") }).addTo(map);
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
      {image && <img className="street-image" src={image.imageUrl} alt="Mapillary street-level imagery" />}
      <div className="street-hud">
        <span>{props.playerName}</span>
        <span>{props.location.prefecture ?? props.location.region ?? "日本"}</span>
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

function PassDevice(props: { label: string; player: Player; onConfirm: () => void; onHome: () => void }) {
  return (
    <section className="pass-screen">
      <div className="pass-card" style={{ "--player-color": props.player.color } as React.CSSProperties}>
        <span className="pass-sub">{props.label}</span>
        <strong className="pass-name">{props.player.nickname}</strong>
        <button className="primary" type="button" onClick={props.onConfirm}>
          画面を見る
        </button>
        <button className="ghost" type="button" onClick={props.onHome}>
          ゲーム一覧
        </button>
      </div>
    </section>
  );
}

function NightPassScreen(props: { title: string; name: string; color: string; onConfirm: () => void; onHome: () => void }) {
  return (
    <section className="pass-screen">
      <div className="pass-card" style={{ "--player-color": props.color } as React.CSSProperties}>
        <span className="pass-sub">夜行動: {props.title}</span>
        <strong className="pass-name">{props.name}</strong>
        <button className="primary" type="button" onClick={props.onConfirm}>
          画面を見る
        </button>
        <button className="ghost" type="button" onClick={props.onHome}>
          ゲーム一覧
        </button>
      </div>
    </section>
  );
}

function NightScreen(props: { title: string; text: string; result?: string; onNext: () => void }) {
  return (
    <section className="screen">
      <Topbar title={props.title} eyebrow="ワンナイト人狼" />
      <div className="content">
        <div className="role-card">
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

  if (persisted.activeSession?.gameId === "geo") {
    geoState = sanitizeLoadedGeoState(loadGameSession<GeoState>(persisted.activeSession.sessionId, "geo")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "number-talk") {
    numberState = sanitizeLoadedNumberTalkState(loadGameSession<NumberTalkState>(persisted.activeSession.sessionId, "number-talk")?.state ?? null);
  }
  if (persisted.activeSession?.gameId === "werewolf") {
    werewolfState = sanitizeLoadedWerewolfState(loadGameSession<WerewolfState>(persisted.activeSession.sessionId, "werewolf")?.state ?? null);
  }

  const hasActiveState = Boolean(geoState ?? numberState ?? werewolfState);
  if (persisted.screen === "game" && !hasActiveState) {
    persisted.screen = "home";
    persisted.selectedGame = null;
    persisted.activeSession = null;
  }

  return {
    ...persisted,
    geoState,
    numberState,
    werewolfState
  };
}

function getActiveGameState(
  gameId: GameId,
  states: { geoState: GeoState | null; numberState: NumberTalkState | null; werewolfState: WerewolfState | null }
) {
  if (gameId === "geo") return states.geoState;
  if (gameId === "number-talk") return states.numberState;
  return states.werewolfState;
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
  if (
    next.phase === "nightSeerHandoff" ||
    next.phase === "nightSeer" ||
    next.phase === "nightWerewolfHandoff" ||
    next.phase === "nightWerewolf" ||
    next.phase === "nightRobberHandoff" ||
    next.phase === "nightRobber" ||
    next.phase === "nightRobberResult"
  ) {
    next.phase = "discussion";
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
