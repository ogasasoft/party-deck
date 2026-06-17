import type * as React from "react";
import { AdSlot, FinalResultActions, PassDevice, Topbar } from "../components/PartyScreens";
import type { GameId, Player } from "../core/types";
import {
  advanceMajorityMatchRound,
  currentMajorityMatchRound,
  scoreMajorityMatchRound,
  submitMajorityMatchAnswer,
  totalMajorityMatchScore,
  type MajorityMatchState
} from "../games/majorityMatch";
import {
  activeOneWordClues,
  advanceOneWordClueRound,
  currentOneWordCluePlayerId,
  currentOneWordClueRound,
  submitOneWordClue,
  submitOneWordGuess,
  toggleOneWordClueCancelled,
  totalOneWordClueCorrect,
  type OneWordClueState
} from "../games/oneWordClue";

type QuickPartyGameScreensProps = {
  selectedGame: GameId;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
  majorityMatchState: MajorityMatchState | null;
  setMajorityMatchState: (state: MajorityMatchState) => void;
  oneWordClueState: OneWordClueState | null;
  setOneWordClueState: (state: OneWordClueState) => void;
};

export default function QuickPartyGameScreens(props: QuickPartyGameScreensProps) {
  if (props.selectedGame === "majority-match" && props.majorityMatchState) {
    return (
      <MajorityMatchGame
        state={props.majorityMatchState}
        setState={props.setMajorityMatchState}
        players={props.players}
        onHome={props.onHome}
        onRestart={props.onRestart}
      />
    );
  }
  if (props.selectedGame === "one-word-clue" && props.oneWordClueState) {
    return (
      <OneWordClueGame
        state={props.oneWordClueState}
        setState={props.setOneWordClueState}
        players={props.players}
        onHome={props.onHome}
        onRestart={props.onRestart}
      />
    );
  }
  return null;
}

function MajorityMatchGame(props: {
  state: MajorityMatchState;
  setState: (state: MajorityMatchState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const round = currentMajorityMatchRound(props.state);
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const currentAnswer = round.answers.find((answer) => answer.playerId === currentPlayer.id)?.text ?? "";

  if (props.state.phase === "answerHandoff") {
    return <PassDevice label={`第${round.roundIndex + 1}問 回答`} player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "answer" })} />;
  }

  if (props.state.phase === "answer") {
    return (
      <section className="screen">
        <Topbar title="秘密回答" eyebrow="みんなと同じ回答" />
        <div className="content">
          <div className="topic">{round.prompt.text}</div>
          <div className="note">
            <strong>{currentPlayer.nickname}だけ入力</strong>
            <span>相談せず、みんなが答えそうな短い回答を考えます。</span>
          </div>
          <input
            className="search-input answer-input"
            value={currentAnswer}
            placeholder="回答を入力"
            maxLength={30}
            autoComplete="off"
            onChange={(event) => props.setState(submitMajorityMatchAnswer(props.state, { playerId: currentPlayer.id, text: event.target.value }))}
          />
          <button
            className="primary"
            type="button"
            disabled={!currentAnswer.trim()}
            onClick={() => {
              const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
              props.setState({
                ...props.state,
                currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
                phase: isLast ? "roundResult" : "answerHandoff"
              });
            }}
          >
            回答を隠して渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "roundResult") {
    const result = scoreMajorityMatchRound(round);
    return (
      <section className="screen">
        <Topbar title={`第${round.roundIndex + 1}問 結果`} eyebrow="みんなと同じ回答" />
        <div className="content">
          <div className="topic">{result.largestGroupSize >= 2 ? `${result.largestGroupSize}人が一致` : "全員ばらばら"}</div>
          <p className="muted">{result.largestGroupSize >= 2 ? "最多回答の人は1点です。同数最多が複数ある場合は、どちらも得点します。" : "同じ回答がなかったため、この問題は得点なしです。"}</p>
          <div className="result-list">
            {round.answers.map((answer) => {
              const player = props.players.find((candidate) => candidate.id === answer.playerId);
              const point = result.pointsByPlayerId[answer.playerId] ?? 0;
              if (!player) return null;
              return (
                <div key={answer.playerId} className={`result-row ${point ? "active-team" : ""}`}>
                  <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                  <strong>{player.nickname}</strong>
                  <span className="score">
                    {point ? "+1" : "0"}
                    <small>{answer.text}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <button className="primary" type="button" onClick={() => props.setState(advanceMajorityMatchRound(props.state))}>
            {round.roundIndex >= props.state.rounds.length - 1 ? "最終結果へ" : "次の問題へ"}
          </button>
        </div>
      </section>
    );
  }

  const rankedPlayers = [...props.players].sort((left, right) => totalMajorityMatchScore(props.state, right.id) - totalMajorityMatchScore(props.state, left.id));
  const highScore = totalMajorityMatchScore(props.state, rankedPlayers[0]?.id ?? "");
  return (
    <section className="screen">
      <Topbar title="最終結果" eyebrow="みんなと同じ回答" />
      <div className="content">
        <div className="topic">{highScore > 0 ? "いちばん空気が合ったのは？" : "今回は全員マイペース"}</div>
        <div className="result-list">
          {rankedPlayers.map((player, index) => (
            <div key={player.id} className="result-row">
              <span className="rank">{index + 1}</span>
              <strong>{player.nickname}</strong>
              <span className="score">{totalMajorityMatchScore(props.state, player.id)}点</span>
            </div>
          ))}
        </div>
        <AdSlot context="result" />
        <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
      </div>
    </section>
  );
}

function OneWordClueGame(props: {
  state: OneWordClueState;
  setState: (state: OneWordClueState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const round = currentOneWordClueRound(props.state);
  const cluePlayerId = currentOneWordCluePlayerId(props.state);
  const cluePlayer = props.players.find((player) => player.id === cluePlayerId) ?? props.players[0];
  const guesser = props.players.find((player) => player.id === round.guesserPlayerId) ?? props.players[0];
  const reviewPlayer = props.players.find((player) => player.id === round.cluePlayerIds[0]) ?? cluePlayer;
  const currentClue = round.clues.find((clue) => clue.playerId === cluePlayerId)?.text ?? "";

  if (props.state.phase === "clueHandoff") {
    return <PassDevice label={`第${round.roundIndex + 1}問 ヒント`} player={cluePlayer} onConfirm={() => props.setState({ ...props.state, phase: "clueEntry" })} />;
  }

  if (props.state.phase === "clueEntry") {
    return (
      <section className="screen">
        <Topbar title="秘密ヒント" eyebrow="ワンワード協力クイズ" />
        <div className="content">
          <div className="secret-card">
            <span className="muted">{cluePlayer.nickname}だけ確認してください</span>
            <h2>{round.target.text}</h2>
            <p>答えそのものを使わず、短い1つのヒントを入力します。</p>
          </div>
          <input
            className="search-input answer-input"
            value={currentClue}
            placeholder="一語ヒント"
            maxLength={20}
            autoComplete="off"
            onChange={(event) => props.setState(submitOneWordClue(props.state, cluePlayerId, event.target.value))}
          />
          <button
            className="primary"
            type="button"
            disabled={!currentClue.trim()}
            onClick={() => {
              const isLast = props.state.currentCluePlayerIndex >= round.cluePlayerIds.length - 1;
              props.setState({
                ...props.state,
                currentCluePlayerIndex: isLast ? props.state.currentCluePlayerIndex : props.state.currentCluePlayerIndex + 1,
                phase: isLast ? "reviewHandoff" : "clueHandoff"
              });
            }}
          >
            ヒントを隠して渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "reviewHandoff") {
    return <PassDevice label="ヒント確認" player={reviewPlayer} onConfirm={() => props.setState({ ...props.state, phase: "clueReview" })} />;
  }

  if (props.state.phase === "clueReview") {
    return (
      <section className="screen">
        <Topbar title="ヒント確認" eyebrow="ワンワード協力クイズ" />
        <div className="content">
          <div className="topic">答え: {round.target.text}</div>
          <div className="note">
            <strong>回答者には見せない</strong>
            <span>同じヒントは自動で消えています。似すぎたヒントや答えを含むヒントもタップして消してください。</span>
          </div>
          <div className="clue-review-list">
            {round.clues.map((clue) => {
              const player = props.players.find((candidate) => candidate.id === clue.playerId);
              const cancelled = clue.autoCancelled || clue.manualCancelled;
              return (
                <button
                  key={clue.playerId}
                  className={`clue-review-row ${cancelled ? "cancelled" : ""}`}
                  type="button"
                  disabled={clue.autoCancelled}
                  onClick={() => props.setState(toggleOneWordClueCancelled(props.state, clue.playerId))}
                >
                  <span className="dot" style={{ "--chip-color": player?.color } as React.CSSProperties} />
                  <strong>{clue.text}</strong>
                  <span>{clue.autoCancelled ? "重複" : clue.manualCancelled ? "取消" : "使用"}</span>
                </button>
              );
            })}
          </div>
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "guesserHandoff" })}>
            回答者へ渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "guesserHandoff") {
    return <PassDevice label="答えを推理" player={guesser} onConfirm={() => props.setState({ ...props.state, phase: "guess" })} />;
  }

  if (props.state.phase === "guess") {
    const activeClues = activeOneWordClues(props.state);
    return (
      <section className="screen">
        <Topbar title="答えを推理" eyebrow="ワンワード協力クイズ" />
        <div className="content">
          <div className="topic">{activeClues.length ? "残ったヒント" : "使えるヒントがありません"}</div>
          <div className="clue-cloud">
            {activeClues.map((clue) => (
              <span key={clue.playerId}>{clue.text}</span>
            ))}
          </div>
          <input
            className="search-input answer-input"
            value={round.guessText ?? ""}
            placeholder="答えを1回だけ入力"
            maxLength={30}
            autoComplete="off"
            onChange={(event) =>
              props.setState({
                ...props.state,
                rounds: props.state.rounds.map((item) => (item.roundIndex === round.roundIndex ? { ...item, guessText: event.target.value } : item))
              })
            }
          />
          <button className="primary" type="button" disabled={!round.guessText?.trim()} onClick={() => props.setState(submitOneWordGuess(props.state, round.guessText ?? ""))}>
            この答えで決定
          </button>
          <button className="secondary" type="button" onClick={() => props.setState(submitOneWordGuess(props.state, ""))}>
            パスする
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "roundResult") {
    const cancelledCount = round.clues.filter((clue) => clue.autoCancelled || clue.manualCancelled).length;
    return (
      <section className="screen">
        <Topbar title={`第${round.roundIndex + 1}問 結果`} eyebrow="ワンワード協力クイズ" />
        <div className="content">
          <div className="topic">{round.correct ? "正解 +1点" : "おしい"}</div>
          <div className="note">
            <strong>答え</strong>
            <span>{round.target.text}</span>
          </div>
          <div className="note">
            <strong>{guesser.nickname}の回答</strong>
            <span>{round.guessText || "パス"}</span>
          </div>
          <div className="note">
            <strong>ヒント</strong>
            <span>
              使用{round.clues.length - cancelledCount}個 / 取消{cancelledCount}個
            </span>
          </div>
          <button className="primary" type="button" onClick={() => props.setState(advanceOneWordClueRound(props.state))}>
            {round.roundIndex >= props.state.rounds.length - 1 ? "最終結果へ" : "次の問題へ"}
          </button>
        </div>
      </section>
    );
  }

  const correctCount = totalOneWordClueCorrect(props.state);
  return (
    <section className="screen">
      <Topbar title="最終結果" eyebrow="ワンワード協力クイズ" />
      <div className="content">
        <div className="topic">
          {correctCount}/{props.state.rounds.length}問 正解
        </div>
        <div className="result-list">
          {props.state.rounds.map((item) => {
            const roundGuesser = props.players.find((player) => player.id === item.guesserPlayerId);
            return (
              <div key={item.roundIndex} className="result-row">
                <span className="rank">{item.roundIndex + 1}</span>
                <strong>{item.target.text}</strong>
                <span className="score">
                  {roundGuesser?.nickname ?? "回答者"}
                  <small>{item.correct ? "正解" : "失敗"}</small>
                  <small>{item.guessText || "パス"}</small>
                </span>
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
