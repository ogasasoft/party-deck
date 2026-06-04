import type * as React from "react";
import { canShowAds } from "../core/adPolicy";
import type { Player } from "../core/types";

export function Topbar(props: { title: string; eyebrow?: string; onBack?: () => void; right?: React.ReactNode }) {
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

export function PassDevice(props: { label: string; player: Player; onConfirm: () => void }) {
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

export function FinalResultActions(props: { onRestart: () => void | Promise<void>; onHome: () => void }) {
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

export function PlayerStrip(props: { players: Player[] }) {
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

export function PlayerOrder(props: { playerIds: string[]; players: Player[] }) {
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

export function AdSlot(props: { context: Parameters<typeof canShowAds>[0] }) {
  if (!canShowAds(props.context)) return null;
  return <div className="ad-slot">広告エリア</div>;
}
