import type * as React from "react";
import { PLAYER_COLORS, type Player } from "../core/types";
import { AdSlot, Topbar } from "./PartyScreens";

export function createGuestPlayer(index: number, now = Date.now()): Player {
  return {
    id: `p${index}-${now.toString(36)}`,
    nickname: `ゲスト${index}`,
    color: PLAYER_COLORS[(index - 1) % PLAYER_COLORS.length]
  };
}

export function normalizePlayerList(players: Player[]) {
  return players.slice(0, 8);
}

export function PlayerSetup(props: { players: Player[]; setPlayers: (players: Player[]) => void; onBack: () => void }) {
  function updatePlayer(id: string, patch: Partial<Player>) {
    props.setPlayers(props.players.map((player) => (player.id === id ? { ...player, ...patch } : player)));
  }

  function addPlayer() {
    if (props.players.length >= 8) return;
    props.setPlayers([...props.players, createGuestPlayer(props.players.length + 1)]);
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
