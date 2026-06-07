import type * as React from "react";
import { useRef, useState } from "react";
import { CountdownTimer } from "../components/CountdownTimer";
import { AdSlot, FinalResultActions, PassDevice, PlayerOrder, PlayerStrip, Topbar } from "../components/PartyScreens";
import type { GameId, Player } from "../core/types";
import { wordInfiltratorTopics } from "../data/wordInfiltratorTopics";
import {
  isWordInfiltrator,
  judgeWordInfiltrator,
  submitWordInfiltratorVote,
  tallyWordInfiltratorVotes,
  type WordInfiltratorState
} from "../games/wordInfiltrator";
import {
  canViewInsiderAnswer,
  getInsiderRole,
  judgeInsiderGuess,
  submitInsiderGuessVote,
  tallyInsiderGuessVotes,
  type InsiderGuessState,
  type InsiderGuessVote
} from "../games/insiderGuess";
import {
  getSpyLocationChoices,
  hasSpyLocationAccusationConsensus,
  isSpyLocationSpy,
  judgeSpyLocation,
  submitSpyLocationAccusationVote,
  type SpyLocationState
} from "../games/spyLocation";
import {
  currentSpectrumRound,
  scoreSpectrumGuess,
  totalSpectrumScore,
  updateCurrentSpectrumRound,
  type SpectrumMeterState
} from "../games/spectrumMeter";
import {
  computeRankingMistakes,
  currentRankingRound,
  getRankingNumberForPlayer,
  moveRankingOrder,
  totalRankingMistakes,
  updateCurrentRankingRound,
  updateRankingAnswerText,
  type RankingAnswersState
} from "../games/rankingAnswers";
import {
  currentDrawingPlayerId,
  isFakeArtist,
  isFakeArtistQuestionMaster,
  judgeFakeArtist,
  submitFakeArtistVote,
  tallyFakeArtistVotes,
  type DrawingPoint,
  type FakeArtistState,
  type FakeArtistStroke
} from "../games/fakeArtist";

type AddedTableGameScreensProps = {
  selectedGame: GameId;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
  wordInfiltratorState: WordInfiltratorState | null;
  setWordInfiltratorState: (state: WordInfiltratorState) => void;
  insiderGuessState: InsiderGuessState | null;
  setInsiderGuessState: (state: InsiderGuessState) => void;
  spyLocationState: SpyLocationState | null;
  setSpyLocationState: (state: SpyLocationState) => void;
  spectrumMeterState: SpectrumMeterState | null;
  setSpectrumMeterState: (state: SpectrumMeterState) => void;
  rankingAnswersState: RankingAnswersState | null;
  setRankingAnswersState: (state: RankingAnswersState) => void;
  fakeArtistState: FakeArtistState | null;
  setFakeArtistState: (state: FakeArtistState) => void;
};

export default function AddedTableGameScreens(props: AddedTableGameScreensProps) {
  if (props.selectedGame === "word-infiltrator" && props.wordInfiltratorState) {
    return <WordInfiltratorGame state={props.wordInfiltratorState} setState={props.setWordInfiltratorState} players={props.players} onHome={props.onHome} onRestart={props.onRestart} />;
  }
  if (props.selectedGame === "insider-guess" && props.insiderGuessState) {
    return <InsiderGuessGame state={props.insiderGuessState} setState={props.setInsiderGuessState} players={props.players} onHome={props.onHome} onRestart={props.onRestart} />;
  }
  if (props.selectedGame === "spy-location" && props.spyLocationState) {
    return <SpyLocationGame state={props.spyLocationState} setState={props.setSpyLocationState} players={props.players} onHome={props.onHome} onRestart={props.onRestart} />;
  }
  if (props.selectedGame === "spectrum-meter" && props.spectrumMeterState) {
    return <SpectrumMeterGame state={props.spectrumMeterState} setState={props.setSpectrumMeterState} players={props.players} onHome={props.onHome} onRestart={props.onRestart} />;
  }
  if (props.selectedGame === "ranking-answers" && props.rankingAnswersState) {
    return <RankingAnswersGame state={props.rankingAnswersState} setState={props.setRankingAnswersState} players={props.players} onHome={props.onHome} onRestart={props.onRestart} />;
  }
  if (props.selectedGame === "fake-artist" && props.fakeArtistState) {
    return <FakeArtistGame state={props.fakeArtistState} setState={props.setFakeArtistState} players={props.players} onHome={props.onHome} onRestart={props.onRestart} />;
  }
  return null;
}

function SecretRevealScreen(props: {
  title: string;
  eyebrow: string;
  player: Player;
  headline: string;
  detail: string;
  tone?: "default" | "danger" | "muted";
  onBack?: () => void;
  onNext: () => void;
}) {
  const toneClass = props.tone === "danger" ? "danger" : props.tone === "muted" ? "muted-card" : "";
  return (
    <section className="screen">
      <Topbar title={props.title} eyebrow={props.eyebrow} onBack={props.onBack} />
      <div className="content">
        <div className={`secret-card ${toneClass}`}>
          <span className="muted">{props.player.nickname}だけ確認してください</span>
          <h2>{props.headline}</h2>
          <p>{props.detail}</p>
        </div>
        <button className="primary" type="button" onClick={props.onNext}>
          隠して渡す
        </button>
      </div>
    </section>
  );
}

function SecretVoteScreen(props: {
  title: string;
  eyebrow: string;
  currentPlayer: Player;
  candidates: Player[];
  onVote: (targetPlayerId: string) => void;
}) {
  return (
    <section className="screen">
      <Topbar title={props.title} eyebrow={props.eyebrow} />
      <div className="content">
        <div className="pass-sub">{props.currentPlayer.nickname}の投票</div>
        <div className="vote-grid">
          {props.candidates.map((player) => (
            <button key={player.id} className="vote-button" type="button" onClick={() => props.onVote(player.id)}>
              {player.nickname}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WordInfiltratorGame(props: {
  state: WordInfiltratorState;
  setState: (state: WordInfiltratorState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const infiltrator = props.players.find((player) => player.id === props.state.infiltratorPlayerId);

  if (props.state.phase === "handoff") {
    return <PassDevice label="秘密確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "revealSecret" })} />;
  }

  if (props.state.phase === "revealSecret") {
    const isInfiltratorPlayer = isWordInfiltrator(props.state, currentPlayer.id);
    return (
      <SecretRevealScreen
        title="秘密確認"
        eyebrow="ワード潜入者"
        player={currentPlayer}
        headline={isInfiltratorPlayer ? "あなたは潜入者" : props.state.topic.secretWord}
        detail={isInfiltratorPlayer ? `カテゴリ: ${props.state.topic.categoryLabel}` : "この言葉が他の人に悟られすぎないよう、ヒントを考えます。"}
        tone={isInfiltratorPlayer ? "danger" : "default"}
        onNext={() => {
          const viewed = [...new Set([...props.state.revealViewedPlayerIds, currentPlayer.id])];
          const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
          props.setState({
            ...props.state,
            revealViewedPlayerIds: viewed,
            currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
            phase: isLast ? "clue" : "handoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "clue") {
    return (
      <section className="screen">
        <Topbar title="ヒント順" eyebrow="ワード潜入者" />
        <div className="content">
          <div className="topic">カテゴリ: {props.state.topic.categoryLabel}</div>
          <CandidateWordList title="公開候補" words={getWordCandidateWords(props.state)} />
          <div className="note">
            <strong>ヒント</strong>
            <span>順番に1語ずつ言います。秘密の言葉をそのまま言ったり、近すぎる説明は避けます。</span>
          </div>
          <PlayerOrder playerIds={props.state.clueOrder} players={props.players} />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "discussion" })}>
            会話へ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "discussion") {
    return (
      <section className="screen">
        <Topbar title="会話" eyebrow="ワード潜入者" />
        <div className="content">
          <div className="topic">誰が潜入者か話し合う</div>
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
    return <PassDevice label="潜入者投票" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "vote" })} />;
  }

  if (props.state.phase === "vote") {
    return (
      <SecretVoteScreen
        title="投票"
        eyebrow="ワード潜入者"
        currentPlayer={currentPlayer}
        candidates={props.players.filter((player) => player.id !== currentPlayer.id)}
        onVote={(targetPlayerId) => {
          const next = submitWordInfiltratorVote(props.state, { fromPlayerId: currentPlayer.id, targetPlayerId });
          const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
          const judged = judgeWordInfiltrator(next);
          props.setState({
            ...next,
            currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
            phase: isLast ? (judged.caught ? "infiltratorGuess" : "result") : "voteHandoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "infiltratorGuess") {
    return (
      <section className="screen">
        <Topbar title="最終推理" eyebrow="ワード潜入者" />
        <div className="content">
          <div className="secret-card danger">
            <span className="muted">{infiltrator?.nickname ?? "潜入者"}だけ入力してください</span>
            <h2>秘密の言葉は？</h2>
            <p>公開候補の中から当てることができれば、潜入者側の逆転勝利です。</p>
          </div>
          <CandidateWordList
            title="公開候補"
            words={getWordCandidateWords(props.state)}
            selected={props.state.infiltratorGuess}
            onSelect={(word) => props.setState({ ...props.state, infiltratorGuess: word })}
          />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "result" })} disabled={!props.state.infiltratorGuess?.trim()}>
            結果を見る
          </button>
        </div>
      </section>
    );
  }

  const result = judgeWordInfiltrator(props.state);
  const voteTally = tallyWordInfiltratorVotes(props.state);
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="ワード潜入者" />
      <div className="content">
        <div className="topic">{result.winningTeam === "majority" ? "多数派の勝利" : "潜入者の勝利"}</div>
        <p className="muted">{result.reason}</p>
        <div className="note">
          <strong>秘密の言葉</strong>
          <span>{props.state.topic.secretWord}</span>
        </div>
        <div className="note">
          <strong>潜入者</strong>
          <span>{infiltrator?.nickname ?? "不明"}</span>
        </div>
        <div className="result-list">
          {props.players.map((player) => {
            const voteCount = voteTally.counts.get(player.id) ?? 0;
            const voted = props.state.votes.find((vote) => vote.fromPlayerId === player.id);
            return (
              <div key={player.id} className="result-row">
                <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                <strong>{player.nickname}</strong>
                <span className="score">
                  {voteCount}票
                  <small>投票: {props.players.find((item) => item.id === voted?.targetPlayerId)?.nickname ?? "未投票"}</small>
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

function InsiderGuessGame(props: {
  state: InsiderGuessState;
  setState: (state: InsiderGuessState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const master = props.players.find((player) => player.id === props.state.masterPlayerId);
  const insider = props.players.find((player) => player.id === props.state.insiderPlayerId);

  if (props.state.phase === "roleHandoff") {
    return <PassDevice label="役職確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "roleReveal" })} />;
  }

  if (props.state.phase === "roleReveal") {
    const role = getInsiderRole(props.state, currentPlayer.id);
    return (
      <SecretRevealScreen
        title="役職確認"
        eyebrow="インサイダー推理"
        player={currentPlayer}
        headline={formatInsiderRole(role)}
        detail={getInsiderRoleDescription(role)}
        tone={role === "insider" ? "danger" : "default"}
        onNext={() => {
          const done = [...new Set([...props.state.roleRevealDonePlayerIds, currentPlayer.id])];
          const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
          props.setState({
            ...props.state,
            roleRevealDonePlayerIds: done,
            currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
            phase: isLast ? "answerHandoff" : "roleHandoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "answerHandoff") {
    return <PassDevice label="答え確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "answerReveal" })} />;
  }

  if (props.state.phase === "answerReveal") {
    const canViewAnswer = canViewInsiderAnswer(props.state, currentPlayer.id);
    return (
      <SecretRevealScreen
        title="答え確認"
        eyebrow="インサイダー推理"
        player={currentPlayer}
        headline={canViewAnswer ? props.state.answer.text : "答えは見ません"}
        detail={canViewAnswer ? `カテゴリ: ${props.state.answer.categoryLabel}` : "市民は答えを知らないまま質問に参加します。"}
        tone={canViewAnswer ? "default" : "muted"}
        onNext={() => {
          const done = [...new Set([...props.state.answerRevealDonePlayerIds, currentPlayer.id])];
          const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
          props.setState({
            ...props.state,
            answerRevealDonePlayerIds: done,
            currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
            phase: isLast ? "question" : "answerHandoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "question") {
    return (
      <section className="screen">
        <Topbar title="質問" eyebrow="インサイダー推理" />
        <div className="content">
          <div className="topic">進行役: {master?.nickname ?? "不明"}</div>
          <div className="note">
            <strong>質問</strong>
            <span>進行役は「はい」「いいえ」「わからない」で答えます。内通者は自然に答えへ近づけます。</span>
          </div>
          <CountdownTimer seconds={props.state.config.questionTimeSec} />
          <div className="actions">
            <button className="primary" type="button" onClick={() => props.setState({ ...props.state, guessedCorrectly: true, phase: "discussion" })}>
              答えが出た
            </button>
            <button className="secondary" type="button" onClick={() => props.setState({ ...props.state, guessedCorrectly: false, phase: "result" })}>
              時間切れ
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (props.state.phase === "discussion") {
    return (
      <section className="screen">
        <Topbar title="内通者探し" eyebrow="インサイダー推理" />
        <div className="content">
          <div className="topic">答え: {props.state.answer.text}</div>
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
    return <PassDevice label="内通者投票" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "vote" })} />;
  }

  if (props.state.phase === "vote") {
    return (
      <SecretVoteScreen
        title="投票"
        eyebrow="インサイダー推理"
        currentPlayer={currentPlayer}
        candidates={props.players.filter((player) => player.id !== currentPlayer.id)}
        onVote={(targetPlayerId) => submitInsiderVote(props.state, props.setState, props.players, { fromPlayerId: currentPlayer.id, targetPlayerId })}
      />
    );
  }

  const result = judgeInsiderGuess(props.state);
  const voteTally = tallyInsiderGuessVotes(props.state);
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="インサイダー推理" />
      <div className="content">
        <div className="topic">{formatInsiderResultTitle(result.winningTeam)}</div>
        <p className="muted">{result.reason}</p>
        <div className="note">
          <strong>答え</strong>
          <span>{props.state.answer.text}</span>
        </div>
        <div className="note">
          <strong>進行役 / 内通者</strong>
          <span>
            {master?.nickname ?? "不明"} / {insider?.nickname ?? "不明"}
          </span>
        </div>
        <div className="result-list">
          {props.players.map((player) => {
            const role = getInsiderRole(props.state, player.id);
            const voted = props.state.votes.find((vote) => vote.fromPlayerId === player.id);
            return (
              <div key={player.id} className="result-row">
                <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                <strong>{player.nickname}</strong>
                <span className="score">
                  {formatInsiderRole(role)}
                  <small>{voteTally.counts.get(player.id) ?? 0}票</small>
                  <small>投票: {props.players.find((item) => item.id === voted?.targetPlayerId)?.nickname ?? "未投票"}</small>
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

function SpyLocationGame(props: {
  state: SpyLocationState;
  setState: (state: SpyLocationState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const spy = props.players.find((player) => player.id === props.state.spyPlayerId);
  const accused = props.players.find((player) => player.id === props.state.accusedPlayerId);

  if (props.state.phase === "handoff") {
    return <PassDevice label="場所確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "revealSecret" })} />;
  }

  if (props.state.phase === "revealSecret") {
    const isSpy = isSpyLocationSpy(props.state, currentPlayer.id);
    return (
      <SecretRevealScreen
        title="場所確認"
        eyebrow="スパイロケーション"
        player={currentPlayer}
        headline={isSpy ? "あなたはスパイ" : props.state.location.name}
        detail={isSpy ? "場所は知らされません。質問に自然に答えながら、場所を推理します。" : props.state.location.hint}
        tone={isSpy ? "danger" : "default"}
        onNext={() => {
          const viewed = [...new Set([...props.state.revealViewedPlayerIds, currentPlayer.id])];
          const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
          props.setState({
            ...props.state,
            revealViewedPlayerIds: viewed,
            currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
            phase: isLast ? "question" : "handoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "question") {
    return (
      <section className="screen">
        <Topbar title="質問" eyebrow="スパイロケーション" />
        <div className="content">
          <div className="topic">質問しながらスパイを探す</div>
          <LocationCandidateList locations={getSpyLocationChoices(props.state)} />
          <div className="note">
            <strong>質問順の目安</strong>
            <span>上から順に質問し、答えた人が次の人へ質問します。</span>
          </div>
          <PlayerOrder playerIds={props.players.map((player) => player.id)} players={props.players} />
          <CountdownTimer seconds={props.state.config.questionTimeSec} />
          <PlayerStrip players={props.players} />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "accuse" })}>
            告発する
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() =>
              props.setState({
                ...props.state,
                currentPlayerIndex: Math.max(0, props.players.findIndex((player) => player.id === props.state.spyPlayerId)),
                phase: "spyGuessHandoff"
              })
            }
          >
            スパイが場所を当てる
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "accuse") {
    return (
      <section className="screen">
        <Topbar title="告発" eyebrow="スパイロケーション" onBack={() => props.setState({ ...props.state, phase: "question" })} />
        <div className="content">
          <div className="topic">誰をスパイとして告発しますか？</div>
          <div className="vote-grid">
            {props.players.map((player) => (
              <button
                key={player.id}
                className="vote-button"
                type="button"
                onClick={() =>
                  props.setState({
                    ...props.state,
                    accusedPlayerId: player.id,
                    accusationVotes: [],
                    currentPlayerIndex: firstSpyAccusationVoterIndex(props.players, player.id),
                    phase: "accusationVoteHandoff"
                  })
                }
              >
                {player.nickname}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (props.state.phase === "accusationVoteHandoff") {
    return <PassDevice label="告発投票" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "accusationVote" })} />;
  }

  if (props.state.phase === "accusationVote") {
    return (
      <section className="screen">
        <Topbar title="告発投票" eyebrow="スパイロケーション" />
        <div className="content">
          <div className="topic">{accused?.nickname ?? "選択した人"}を公開しますか？</div>
          <div className="actions">
            <button className="primary" type="button" onClick={() => submitSpyAccusationVote(props.state, props.setState, props.players, true)}>
              賛成
            </button>
            <button className="secondary" type="button" onClick={() => submitSpyAccusationVote(props.state, props.setState, props.players, false)}>
              反対
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (props.state.phase === "spyGuessHandoff") {
    return <PassDevice label="場所推理" player={spy ?? currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "spyGuess" })} />;
  }

  if (props.state.phase === "spyGuess") {
    return (
      <section className="screen">
        <Topbar title="場所推理" eyebrow="スパイロケーション" onBack={() => props.setState({ ...props.state, phase: "question" })} />
        <div className="content">
          <div className="secret-card danger">
            <span className="muted">{spy?.nickname ?? "スパイ"}だけ選んでください</span>
            <h2>場所はどこ？</h2>
            <p>正解すればスパイ側の勝利です。</p>
          </div>
          <LocationCandidateList locations={getSpyLocationChoices(props.state)} compact />
          <div className="vote-grid">
            {getSpyLocationChoices(props.state).map((location) => (
              <button key={location.id} className="vote-button" type="button" onClick={() => props.setState({ ...props.state, spyGuessLocationId: location.id, phase: "result" })}>
                {location.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const result = judgeSpyLocation(props.state, props.players.length);
  const yesVotes = props.state.accusationVotes.filter((vote) => vote.agrees).length;
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="スパイロケーション" />
      <div className="content">
        <div className="topic">{result.winningTeam === "locals" ? "場所を知る側の勝利" : "スパイの勝利"}</div>
        <p className="muted">{result.reason}</p>
        <div className="note">
          <strong>場所</strong>
          <span>
            {props.state.location.name} / {props.state.location.hint}
          </span>
        </div>
        <div className="note">
          <strong>スパイ</strong>
          <span>{spy?.nickname ?? "不明"}</span>
        </div>
        {props.state.accusedPlayerId && (
          <div className="note">
            <strong>告発</strong>
            <span>
              {accused?.nickname ?? "不明"} / 賛成{yesVotes}票
            </span>
          </div>
        )}
        {props.state.spyGuessLocationId && (
          <div className="note">
            <strong>スパイの推理</strong>
            <span>{getSpyLocationChoices(props.state).find((location) => location.id === props.state.spyGuessLocationId)?.name ?? "不明"}</span>
          </div>
        )}
        <AdSlot context="result" />
        <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
      </div>
    </section>
  );
}

function SpectrumMeterGame(props: {
  state: SpectrumMeterState;
  setState: (state: SpectrumMeterState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const round = currentSpectrumRound(props.state);
  const psychic = props.players.find((player) => player.id === round.psychicPlayerId) ?? props.players[0];
  const guessValue = round.guessValue ?? 50;

  if (props.state.phase === "psychicHandoff") {
    return <PassDevice label="親の確認" player={psychic} onConfirm={() => props.setState({ ...props.state, phase: "psychicReveal" })} />;
  }

  if (props.state.phase === "psychicReveal") {
    return (
      <section className="screen">
        <Topbar title="親の確認" eyebrow="価値観メーター" />
        <div className="content">
          <SpectrumScaleCard round={round} showTarget />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "clue" })}>
            ヒントへ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "clue") {
    return (
      <section className="screen">
        <Topbar title="ヒント" eyebrow="価値観メーター" />
        <div className="content">
          <SpectrumScaleCard round={round} />
          <input
            className="search-input"
            value={round.clue ?? ""}
            placeholder="親のヒントを入力"
            onChange={(event) => props.setState(updateCurrentSpectrumRound(props.state, { clue: event.target.value }))}
          />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "guess" })} disabled={!round.clue?.trim()}>
            推測へ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "guess") {
    return (
      <section className="screen">
        <Topbar title="推測" eyebrow="価値観メーター" onBack={() => props.setState({ ...props.state, phase: "clue" })} />
        <div className="content">
          <SpectrumScaleCard round={round} />
          <div className="topic">{round.clue}</div>
          <RangeGuess value={guessValue} onChange={(value) => props.setState(updateCurrentSpectrumRound(props.state, { guessValue: value }))} />
          <button
            className="primary"
            type="button"
            onClick={() => {
              const score = scoreSpectrumGuess(round.targetValue, guessValue);
              props.setState({ ...updateCurrentSpectrumRound(props.state, { guessValue, score }), phase: "roundResult" });
            }}
          >
            結果を見る
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "roundResult") {
    const delta = Math.abs(round.targetValue - guessValue);
    const isLastRound = props.state.currentRoundIndex >= props.state.rounds.length - 1;
    return (
      <section className="screen">
        <Topbar title="結果" eyebrow="価値観メーター" />
        <div className="content">
          <SpectrumScaleCard round={round} showTarget showGuess />
          <div className="note">
            <strong>{round.score ?? 0}点</strong>
            <span>差は{delta}です。</span>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() =>
              props.setState({
                ...props.state,
                currentRoundIndex: isLastRound ? props.state.currentRoundIndex : props.state.currentRoundIndex + 1,
                phase: isLastRound ? "final" : "psychicHandoff"
              })
            }
          >
            {isLastRound ? "最終結果へ" : "次の親へ"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <Topbar title="最終結果" eyebrow="価値観メーター" />
      <div className="content">
        <div className="topic">合計 {totalSpectrumScore(props.state)}点</div>
        <div className="result-list">
          {props.state.rounds.map((item) => {
            const player = props.players.find((candidate) => candidate.id === item.psychicPlayerId);
            return (
              <div key={item.roundIndex} className="result-row">
                <span className="rank">{item.roundIndex + 1}</span>
                <strong>{player?.nickname ?? "親"}</strong>
                <span className="score">
                  {item.score ?? 0}点
                  <small>
                    {item.scale.leftLabel} / {item.scale.rightLabel}
                  </small>
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

function RankingAnswersGame(props: {
  state: RankingAnswersState;
  setState: (state: RankingAnswersState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const round = currentRankingRound(props.state);
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const captain = props.players.find((player) => player.id === round.captainPlayerId) ?? props.players[0];
  const usedTokens = totalRankingMistakes(props.state);
  const remainingTokens = Math.max(0, props.state.config.mistakeLimit - usedTokens);

  if (props.state.phase === "numberHandoff") {
    return <PassDevice label="数字確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "numberReveal" })} />;
  }

  if (props.state.phase === "numberReveal") {
    return (
      <section className="screen">
        <Topbar title="数字確認" eyebrow="ランキング回答" />
        <div className="content">
          <div className="topic">{round.prompt.text}</div>
          <div className="number-card">
            <span className="muted">{currentPlayer.nickname}の数字</span>
            <strong>{getRankingNumberForPlayer(props.state, currentPlayer.id)}</strong>
          </div>
          <button
            className="primary"
            type="button"
            onClick={() => {
              const done = [...new Set([...props.state.numberRevealDonePlayerIds, currentPlayer.id])];
              const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
              props.setState({
                ...props.state,
                numberRevealDonePlayerIds: done,
                currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
                phase: isLast ? "answer" : "numberHandoff"
              });
            }}
          >
            隠して渡す
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "answer") {
    return (
      <section className="screen">
        <Topbar title="回答" eyebrow="ランキング回答" />
        <div className="content">
          <div className="topic">{round.prompt.text}</div>
          <RankingTokenTrack total={props.state.config.mistakeLimit} remaining={remainingTokens} />
          <div className="hint-row">
            <span>{round.prompt.lowLabel}</span>
            <span>{round.prompt.highLabel}</span>
          </div>
          <div className="note">
            <strong>キャプテン</strong>
            <span>{captain?.nickname ?? "不明"}が小さい順に並べます。</span>
          </div>
          <div className="answer-list">
            {props.players.map((player) => {
              const assignment = round.assignments.find((item) => item.playerId === player.id);
              return (
                <label key={player.id} className="answer-row">
                  <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                  <strong>{player.nickname}</strong>
                  <input value={assignment?.answerText ?? ""} placeholder="回答メモ" onChange={(event) => props.setState(updateRankingAnswerText(props.state, player.id, event.target.value))} />
                </label>
              );
            })}
          </div>
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "order" })}>
            並び替えへ
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "order") {
    const orderedPlayers = round.captainOrder.map((playerId) => props.players.find((player) => player.id === playerId)).filter(Boolean) as Player[];
    return (
      <section className="screen">
        <Topbar title="並び替え" eyebrow="ランキング回答" onBack={() => props.setState({ ...props.state, phase: "answer" })} />
        <div className="content">
          <div className="topic">キャプテン: {captain?.nickname ?? "不明"}</div>
          <RankingTokenTrack total={props.state.config.mistakeLimit} remaining={remainingTokens} />
          <div className="order-list">
            {orderedPlayers.map((player, index) => (
              <div key={player.id} className="order-item">
                <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                <strong>{player.nickname}</strong>
                <button className="small-button" type="button" onClick={() => props.setState(moveRankingOrder(props.state, index, -1))}>
                  ↑
                </button>
                <button className="small-button" type="button" onClick={() => props.setState(moveRankingOrder(props.state, index, 1))}>
                  ↓
                </button>
              </div>
            ))}
          </div>
          <button
            className="primary"
            type="button"
            onClick={() => {
              const mistakeCount = computeRankingMistakes(round);
              props.setState({ ...updateCurrentRankingRound(props.state, { mistakeCount }), phase: "roundResult" });
            }}
          >
            結果を見る
          </button>
        </div>
      </section>
    );
  }

  if (props.state.phase === "roundResult") {
    const isLastRound = props.state.currentRoundIndex >= props.state.rounds.length - 1;
    const isOutOfTokens = usedTokens >= props.state.config.mistakeLimit;
    const resultRows = getRankingRoundRows(round, props.players);
    return (
      <section className="screen">
        <Topbar title="結果" eyebrow="ランキング回答" />
        <div className="content">
          <div className="topic">ミス {round.mistakeCount ?? 0}</div>
          <RankingTokenTrack total={props.state.config.mistakeLimit} remaining={remainingTokens} />
          <div className="result-list">
            {resultRows.map(({ player, assignment, breaksOrder }) => {
              return (
                <div key={player.id} className={`result-row ${breaksOrder ? "result-row-alert" : ""}`}>
                  <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                  <strong>{player.nickname}</strong>
                  <span className="score">
                    {breaksOrder && <small className="status-badge">ミス</small>}
                    {assignment.number}
                    <small>{assignment.answerText || "回答メモなし"}</small>
                  </span>
                </div>
              );
            })}
          </div>
          <button
            className="primary"
            type="button"
            onClick={() =>
              props.setState({
                ...props.state,
                currentRoundIndex: isLastRound || isOutOfTokens ? props.state.currentRoundIndex : props.state.currentRoundIndex + 1,
                currentPlayerIndex: 0,
                numberRevealDonePlayerIds: [],
                phase: isLastRound || isOutOfTokens ? "final" : "numberHandoff"
              })
            }
          >
            {isLastRound || isOutOfTokens ? "最終結果へ" : "次のラウンドへ"}
          </button>
        </div>
      </section>
    );
  }

  const totalMistakes = totalRankingMistakes(props.state);
  const success = totalMistakes < props.state.config.mistakeLimit;
  return (
    <section className="screen">
      <Topbar title="最終結果" eyebrow="ランキング回答" />
      <div className="content">
        <div className="topic">{success ? "協力成功" : "協力失敗"}</div>
        <RankingTokenTrack total={props.state.config.mistakeLimit} remaining={Math.max(0, props.state.config.mistakeLimit - totalMistakes)} />
        <div className="note">
          <strong>残りトークン</strong>
          <span>
            {Math.max(0, props.state.config.mistakeLimit - totalMistakes)}/{props.state.config.mistakeLimit}
          </span>
        </div>
        <div className="result-list">
          {props.state.rounds.map((item) => (
            <div key={item.roundIndex} className="result-row">
              <span className="rank">{item.roundIndex + 1}</span>
              <strong>{item.prompt.text}</strong>
              <span className="score">{item.mistakeCount ?? 0}</span>
            </div>
          ))}
        </div>
        <AdSlot context="result" />
        <FinalResultActions onRestart={props.onRestart} onHome={props.onHome} />
      </div>
    </section>
  );
}

function FakeArtistGame(props: {
  state: FakeArtistState;
  setState: (state: FakeArtistState) => void;
  players: Player[];
  onHome: () => void;
  onRestart: () => void | Promise<void>;
}) {
  const currentPlayer = props.players[props.state.currentPlayerIndex] ?? props.players[0];
  const drawingPlayer = props.players.find((player) => player.id === currentDrawingPlayerId(props.state)) ?? props.players[0];
  const questionMaster = props.players.find((player) => player.id === props.state.questionMasterPlayerId);
  const fakeArtist = props.players.find((player) => player.id === props.state.fakeArtistPlayerId);

  if (props.state.phase === "handoff") {
    return <PassDevice label="お題確認" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "revealSecret" })} />;
  }

  if (props.state.phase === "revealSecret") {
    const isFake = isFakeArtist(props.state, currentPlayer.id);
    const isQuestionMaster = isFakeArtistQuestionMaster(props.state, currentPlayer.id);
    return (
      <SecretRevealScreen
        title="お題確認"
        eyebrow="エセアーティスト"
        player={currentPlayer}
        headline={isQuestionMaster ? "あなたは出題者" : isFake ? "あなたは偽物" : props.state.topic.text}
        detail={
          isQuestionMaster
            ? `お題: ${props.state.topic.text} / カテゴリ: ${props.state.topic.categoryLabel}。描かずに進行を見守ります。`
            : isFake
              ? `カテゴリ: ${props.state.topic.categoryLabel}`
              : "お題を知られすぎないよう、自然な線を描きます。"
        }
        tone={isFake ? "danger" : "default"}
        onNext={() => {
          const viewed = [...new Set([...props.state.revealViewedPlayerIds, currentPlayer.id])];
          const isLast = props.state.currentPlayerIndex >= props.players.length - 1;
          props.setState({
            ...props.state,
            revealViewedPlayerIds: viewed,
            currentPlayerIndex: isLast ? 0 : props.state.currentPlayerIndex + 1,
            phase: isLast ? "draw" : "handoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "draw") {
    return (
      <section className="screen">
        <Topbar title="描く" eyebrow="エセアーティスト" />
        <div className="content">
          <div className="topic">
            {drawingPlayer?.nickname ?? "次の人"}の線 {props.state.currentStrokeIndex + 1}/{props.state.drawOrder.length}
          </div>
          <DrawingPad
            strokes={props.state.strokes}
            players={props.players}
            currentPlayer={drawingPlayer}
            onSave={(stroke) => {
              const isLast = props.state.currentStrokeIndex >= props.state.drawOrder.length - 1;
              props.setState({
                ...props.state,
                strokes: [...props.state.strokes, stroke],
                currentStrokeIndex: isLast ? props.state.currentStrokeIndex : props.state.currentStrokeIndex + 1,
                currentPlayerIndex: isLast ? firstFakeArtistVoterIndex(props.players, props.state.questionMasterPlayerId) : 0,
                phase: isLast ? "voteHandoff" : "draw"
              });
            }}
          />
        </div>
      </section>
    );
  }

  if (props.state.phase === "voteHandoff") {
    return <PassDevice label="偽物投票" player={currentPlayer} onConfirm={() => props.setState({ ...props.state, phase: "vote" })} />;
  }

  if (props.state.phase === "vote") {
    return (
      <SecretVoteScreen
        title="投票"
        eyebrow="エセアーティスト"
        currentPlayer={currentPlayer}
        candidates={props.players.filter((player) => player.id !== currentPlayer.id && player.id !== props.state.questionMasterPlayerId)}
        onVote={(targetPlayerId) => {
          const next = submitFakeArtistVote(props.state, { fromPlayerId: currentPlayer.id, targetPlayerId });
          const nextVoterIndex = nextFakeArtistVoterIndex(props.players, props.state.questionMasterPlayerId, props.state.currentPlayerIndex);
          const isLast = nextVoterIndex === -1;
          const judged = judgeFakeArtist(next);
          props.setState({
            ...next,
            currentPlayerIndex: isLast ? 0 : nextVoterIndex,
            phase: isLast ? (judged.caught ? "fakeGuess" : "result") : "voteHandoff"
          });
        }}
      />
    );
  }

  if (props.state.phase === "fakeGuess") {
    return (
      <section className="screen">
        <Topbar title="最終推理" eyebrow="エセアーティスト" />
        <div className="content">
          <div className="secret-card danger">
            <span className="muted">{fakeArtist?.nickname ?? "偽物"}だけ入力してください</span>
            <h2>お題は何？</h2>
            <p>当てれば偽物側の逆転勝利です。</p>
          </div>
          <input
            className="search-input"
            value={props.state.fakeGuess ?? ""}
            placeholder="推理したお題"
            onChange={(event) => props.setState({ ...props.state, fakeGuess: event.target.value })}
          />
          <button className="primary" type="button" onClick={() => props.setState({ ...props.state, phase: "result" })} disabled={!props.state.fakeGuess?.trim()}>
            結果を見る
          </button>
        </div>
      </section>
    );
  }

  const result = judgeFakeArtist(props.state);
  const voteTally = tallyFakeArtistVotes(props.state);
  return (
    <section className="screen">
      <Topbar title="結果" eyebrow="エセアーティスト" />
      <div className="content">
        <div className="topic">{result.winningTeam === "artists" ? "本物側の勝利" : "偽物側の勝利"}</div>
        <p className="muted">{result.reason}</p>
        <DrawingPreview strokes={props.state.strokes} players={props.players} />
        <div className="note">
          <strong>お題</strong>
          <span>{props.state.topic.text}</span>
        </div>
        <div className="note">
          <strong>偽物</strong>
          <span>{fakeArtist?.nickname ?? "不明"}</span>
        </div>
        <div className="note">
          <strong>出題者</strong>
          <span>{questionMaster?.nickname ?? "不明"}</span>
        </div>
        <div className="result-list">
          {props.players
            .filter((player) => player.id !== props.state.questionMasterPlayerId)
            .map((player) => {
              const voted = props.state.votes.find((vote) => vote.fromPlayerId === player.id);
              return (
                <div key={player.id} className="result-row">
                  <span className="dot" style={{ "--chip-color": player.color } as React.CSSProperties} />
                  <strong>{player.nickname}</strong>
                  <span className="score">
                    {voteTally.counts.get(player.id) ?? 0}票
                    <small>投票: {props.players.find((item) => item.id === voted?.targetPlayerId)?.nickname ?? "未投票"}</small>
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

function submitInsiderVote(state: InsiderGuessState, setState: (state: InsiderGuessState) => void, players: Player[], vote: InsiderGuessVote) {
  const next = submitInsiderGuessVote(state, vote);
  const isLast = state.currentPlayerIndex >= players.length - 1;
  setState({
    ...next,
    currentPlayerIndex: isLast ? state.currentPlayerIndex : state.currentPlayerIndex + 1,
    phase: isLast ? "result" : "voteHandoff"
  });
}

function submitSpyAccusationVote(state: SpyLocationState, setState: (state: SpyLocationState) => void, players: Player[], agrees: boolean) {
  const current = players[state.currentPlayerIndex];
  const voter = current?.id !== state.accusedPlayerId ? current : players.find((player) => player.id !== state.accusedPlayerId) ?? players[0];
  const next = submitSpyLocationAccusationVote(state, { fromPlayerId: voter.id, agrees });
  const nextVoterIndex = nextSpyAccusationVoterIndex(players, state.accusedPlayerId, state.currentPlayerIndex);
  const isLast = nextVoterIndex === -1;
  const hasConsensus = hasSpyLocationAccusationConsensus(next, players.length);
  setState({
    ...next,
    currentPlayerIndex: isLast ? 0 : nextVoterIndex,
    phase: isLast ? (hasConsensus ? "result" : "question") : "accusationVoteHandoff",
    accusationVotes: isLast && !hasConsensus ? [] : next.accusationVotes,
    accusedPlayerId: isLast && !hasConsensus ? undefined : next.accusedPlayerId
  });
}

function firstSpyAccusationVoterIndex(players: Player[], accusedPlayerId: string) {
  return Math.max(
    0,
    players.findIndex((player) => player.id !== accusedPlayerId)
  );
}

function nextSpyAccusationVoterIndex(players: Player[], accusedPlayerId: string | undefined, currentIndex: number) {
  return players.findIndex((player, index) => index > currentIndex && player.id !== accusedPlayerId);
}

function firstFakeArtistVoterIndex(players: Player[], questionMasterPlayerId: string) {
  return Math.max(
    0,
    players.findIndex((player) => player.id !== questionMasterPlayerId)
  );
}

function nextFakeArtistVoterIndex(players: Player[], questionMasterPlayerId: string, currentIndex: number) {
  return players.findIndex((player, index) => index > currentIndex && player.id !== questionMasterPlayerId);
}

function formatInsiderRole(role: ReturnType<typeof getInsiderRole>) {
  if (role === "master") return "進行役";
  if (role === "insider") return "内通者";
  return "市民";
}

function getInsiderRoleDescription(role: ReturnType<typeof getInsiderRole>) {
  if (role === "master") return "答えを知り、質問へ「はい」「いいえ」「わからない」で答えます。";
  if (role === "insider") return "答えを知っています。正体がばれないよう、自然に答えへ近づけます。";
  return "答えを知らないまま質問し、最後に内通者を探します。";
}

function formatInsiderResultTitle(team: ReturnType<typeof judgeInsiderGuess>["winningTeam"]) {
  if (team === "citizens") return "市民側の勝利";
  if (team === "insider") return "内通者の勝利";
  return "全員失敗";
}

function SpectrumScaleCard(props: { round: ReturnType<typeof currentSpectrumRound>; showTarget?: boolean; showGuess?: boolean }) {
  const target = props.round.targetValue;
  const guess = props.round.guessValue ?? 50;
  return (
    <section className="meter-card">
      <div className="meter-labels">
        <strong>{props.round.scale.leftLabel}</strong>
        <strong>{props.round.scale.rightLabel}</strong>
      </div>
      <div className="meter-track" aria-hidden="true">
        {props.showTarget && <span className="meter-marker target" style={{ left: `${target}%` }} />}
        {props.showGuess && <span className="meter-marker guess" style={{ left: `${guess}%` }} />}
      </div>
      <div className="meter-values">
        {props.showTarget ? <span>正解 {target}</span> : <span>正解は親だけ</span>}
        {props.showGuess && <span>回答 {guess}</span>}
      </div>
    </section>
  );
}

function RangeGuess(props: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="range-card">
      <input type="range" min="0" max="100" value={props.value} onChange={(event) => props.onChange(Number(event.target.value))} aria-label="推測位置" />
      <strong>{props.value}</strong>
    </div>
  );
}

function getWordCandidateWords(state: WordInfiltratorState) {
  return wordInfiltratorTopics
    .filter((topic) => topic.enabled && topic.category === state.topic.category)
    .map((topic) => topic.secretWord);
}

function CandidateWordList(props: { title: string; words: string[]; selected?: string; onSelect?: (word: string) => void }) {
  return (
    <div className="candidate-panel">
      <strong>{props.title}</strong>
      <div className="candidate-list">
        {props.words.map((word) =>
          props.onSelect ? (
            <button key={word} className={props.selected === word ? "candidate-chip active" : "candidate-chip"} type="button" onClick={() => props.onSelect?.(word)}>
              {word}
            </button>
          ) : (
            <span key={word} className="candidate-chip">
              {word}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function LocationCandidateList(props: { locations: ReturnType<typeof getSpyLocationChoices>; compact?: boolean }) {
  return (
    <details className={`candidate-panel ${props.compact ? "compact-candidates" : ""}`} open={!props.compact}>
      <summary>場所候補</summary>
      <div className="candidate-list">
        {props.locations.map((location) => (
          <span key={location.id} className="candidate-chip">
            {location.name}
          </span>
        ))}
      </div>
    </details>
  );
}

function RankingTokenTrack(props: { total: number; remaining: number }) {
  return (
    <div className="token-track" aria-label={`残りトークン ${props.remaining}/${props.total}`}>
      <span>残りトークン</span>
      <div>
        {Array.from({ length: props.total }, (_, index) => (
          <span key={index} className={index < props.remaining ? "token-dot active" : "token-dot"} />
        ))}
      </div>
    </div>
  );
}

function getRankingRoundRows(round: ReturnType<typeof currentRankingRound>, players: Player[]) {
  let previousNumber = -Infinity;
  return round.captainOrder
    .map((playerId) => {
      const player = players.find((item) => item.id === playerId);
      const assignment = round.assignments.find((item) => item.playerId === playerId);
      if (!player || !assignment) return null;
      const breaksOrder = assignment.number < previousNumber;
      previousNumber = assignment.number;
      return { player, assignment, breaksOrder };
    })
    .filter((item): item is { player: Player; assignment: NonNullable<typeof item>["assignment"]; breaksOrder: boolean } => Boolean(item));
}

function DrawingPad(props: { strokes: FakeArtistStroke[]; players: Player[]; currentPlayer: Player; onSave: (stroke: FakeArtistStroke) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draftPoints, setDraftPoints] = useState<DrawingPoint[]>([]);
  const isDrawingRef = useRef(false);

  function getPoint(event: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100
    };
  }

  function saveStroke() {
    if (draftPoints.length < 2) return;
    props.onSave({
      playerId: props.currentPlayer.id,
      color: props.currentPlayer.color,
      points: draftPoints
    });
    setDraftPoints([]);
  }

  return (
    <div className="drawing-card">
      <svg
        ref={svgRef}
        className="drawing-board"
        viewBox="0 0 100 100"
        role="img"
        aria-label="描画キャンバス"
        onPointerDown={(event) => {
          isDrawingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDraftPoints([getPoint(event)]);
        }}
        onPointerMove={(event) => {
          if (!isDrawingRef.current) return;
          setDraftPoints((points) => [...points, getPoint(event)]);
        }}
        onPointerUp={() => {
          isDrawingRef.current = false;
        }}
        onPointerCancel={() => {
          isDrawingRef.current = false;
        }}
      >
        <DrawingLines strokes={props.strokes} players={props.players} />
        {draftPoints.length > 1 && <polyline points={formatDrawingPoints(draftPoints)} fill="none" stroke={props.currentPlayer.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div className="actions">
        <button className="secondary" type="button" onClick={() => setDraftPoints([])} disabled={draftPoints.length === 0}>
          やり直す
        </button>
        <button className="primary" type="button" onClick={saveStroke} disabled={draftPoints.length < 2}>
          線を確定
        </button>
      </div>
    </div>
  );
}

function DrawingPreview(props: { strokes: FakeArtistStroke[]; players: Player[] }) {
  return (
    <div className="drawing-card">
      <svg className="drawing-board compact-drawing" viewBox="0 0 100 100" role="img" aria-label="完成した絵">
        <DrawingLines strokes={props.strokes} players={props.players} />
      </svg>
    </div>
  );
}

function DrawingLines(props: { strokes: FakeArtistStroke[]; players: Player[] }) {
  return (
    <>
      {props.strokes.map((stroke, index) => {
        const player = props.players.find((item) => item.id === stroke.playerId);
        return <polyline key={`${stroke.playerId}-${index}`} points={formatDrawingPoints(stroke.points)} fill="none" stroke={player?.color ?? stroke.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </>
  );
}

function formatDrawingPoints(points: DrawingPoint[]) {
  return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}
