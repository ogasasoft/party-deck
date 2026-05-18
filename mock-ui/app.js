const app = document.querySelector("#app");

const colors = ["#d64545", "#0f8b8d", "#f0b429", "#2e67b1", "#2d7d46", "#7c4dff", "#e76f51", "#4f5d75"];

const games = {
  geo: {
    id: "geo",
    title: "日本マップGuessr",
    badge: "JPN",
    iconClass: "geo",
    people: "2-8人",
    description: "Mapillaryの日本画像を見て、全員が同じ地点を順番に当てます。",
  },
  ito: {
    id: "ito",
    title: "ナンバートーク",
    badge: "100",
    iconClass: "ito",
    people: "2-8人",
    description: "1から100の数字を直接言わず、お題への価値観で順番を推理します。",
  },
  wolf: {
    id: "wolf",
    title: "ワンナイト人狼",
    badge: "夜",
    iconClass: "wolf",
    people: "3-8人",
    description: "村人、人狼、占い師、怪盗で夜行動、議論、投票を1ゲームで遊びます。",
  },
};

const state = {
  screen: "home",
  selectedGame: null,
  players: [
    { id: "p1", name: "アオイ", color: colors[0] },
    { id: "p2", name: "ミナト", color: colors[1] },
    { id: "p3", name: "ユイ", color: colors[2] },
    { id: "p4", name: "レン", color: colors[3] },
  ],
  sessions: {
    geo: { playerIndex: 0, round: 1, answered: [], mapOpen: false },
    ito: { playerIndex: 0, revealed: [], order: ["p3", "p1", "p4", "p2"], phase: "settings" },
    wolf: { playerIndex: 0, revealed: [], votes: [], phase: "settings" },
  },
};

const itoNumbers = {
  p1: 18,
  p2: 72,
  p3: 41,
  p4: 93,
  p5: 9,
  p6: 57,
  p7: 66,
  p8: 30,
};

const wolfRoles = {
  p1: { name: "村人", team: "人間", mark: "村", text: "特別な夜行動はありません。議論で人狼を探します。" },
  p2: { name: "人狼", team: "人狼", mark: "狼", text: "仲間の人狼を確認します。処刑されないように話します。" },
  p3: { name: "占い師", team: "人間", mark: "占", text: "他プレイヤー1人、または中央の2枚を確認できます。" },
  p4: { name: "怪盗", team: "変化", mark: "盗", text: "自分のカードと他プレイヤー1人のカードを交換できます。" },
  p5: { name: "村人", team: "人間", mark: "村", text: "特別な夜行動はありません。議論で人狼を探します。" },
  p6: { name: "人狼", team: "人狼", mark: "狼", text: "仲間の人狼を確認します。処刑されないように話します。" },
  p7: { name: "占い師", team: "人間", mark: "占", text: "他プレイヤー1人、または中央の2枚を確認できます。" },
  p8: { name: "村人", team: "人間", mark: "村", text: "特別な夜行動はありません。議論で人狼を探します。" },
};

const geoScores = [
  { distance: "1.2km", score: 4860 },
  { distance: "4.8km", score: 4310 },
  { distance: "13km", score: 3580 },
  { distance: "22km", score: 2890 },
  { distance: "35km", score: 2310 },
  { distance: "58km", score: 1710 },
  { distance: "74km", score: 1390 },
  { distance: "96km", score: 1080 },
];

function setScreen(screen, selectedGame = state.selectedGame) {
  state.screen = screen;
  state.selectedGame = selectedGame;
  render();
}

function currentPlayer(sessionKey) {
  const session = state.sessions[sessionKey];
  return state.players[session.playerIndex] || state.players[0];
}

function topbar(title, eyebrow = "Party Deck") {
  const backTargets = {
    players: "home",
    settings: "home",
    geoSettings: "home",
    itoSettings: "home",
    wolfSettings: "home",
    geoPass: "geoSettings",
    geoPlay: "geoPass",
    geoMap: "geoPlay",
    geoResult: "geoPlay",
    itoPass: "itoSettings",
    itoReveal: "itoPass",
    itoDiscuss: "itoReveal",
    itoOrder: "itoDiscuss",
    itoResult: "itoOrder",
    wolfPass: "wolfSettings",
    wolfRole: "wolfPass",
    wolfNight: "wolfRole",
    wolfDiscuss: "wolfNight",
    wolfVotePass: "wolfDiscuss",
    wolfVote: "wolfDiscuss",
    wolfResult: "wolfVote",
  };
  const back = backTargets[state.screen];
  return `
    <header class="topbar">
      <div class="brand">
        <div class="mark" aria-hidden="true"></div>
        <div class="brand-copy">
          <div class="eyebrow">${eyebrow}</div>
          <h1 class="title">${title}</h1>
        </div>
      </div>
      ${
        back
          ? `<button class="icon-button" type="button" data-nav="${back}" aria-label="戻る">‹</button>`
          : `<button class="text-button" type="button" data-nav="players" aria-label="プレイヤー設定">プレイヤー</button>`
      }
    </header>
  `;
}

function playerStrip() {
  return `
    <div class="players-strip" aria-label="プレイヤー">
      ${state.players
        .map(
          (player) => `
            <div class="player-chip">
              <span class="dot" style="--chip-color:${player.color}"></span>
              ${escapeHtml(player.name)}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function homeScreen() {
  return `
    <section class="screen">
      ${topbar("ゲームを選ぶ")}
      <div class="content bottom-safe">
        <div class="game-grid">
          ${Object.values(games)
            .map(
              (game) => `
                <button class="game-card" type="button" data-start-game="${game.id}">
                  <span class="game-card-header">
                    <span>
                      <span class="game-title">${game.title}</span>
                      <span class="meta">
                        <span class="pill">${game.people}</span>
                      </span>
                    </span>
                  </span>
                  <span class="game-description">${game.description}</span>
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="ad-slot">広告エリア</div>
      </div>
    </section>
  `;
}

function playersScreen() {
  return `
    <section class="screen">
      ${topbar("プレイヤー")}
      <div class="content bottom-safe">
        <div class="result-list">
          ${state.players
            .map(
              (player, index) => `
                <div class="player-row">
                  <span class="dot" style="--chip-color:${player.color}"></span>
                  <input value="${escapeHtml(player.name)}" maxlength="10" data-player-name="${player.id}" aria-label="${escapeHtml(player.name)}の名前" />
                  <button class="icon-button" type="button" data-remove-player="${player.id}" aria-label="削除" ${state.players.length <= 2 ? "disabled" : ""}>×</button>
                </div>
                <div class="swatches" data-color-row="${player.id}">
                  ${colors
                    .map(
                      (color) => `
                        <button class="swatch ${color === player.color ? "selected" : ""}" type="button" style="--swatch:${color}" data-player-color="${player.id}" data-color="${color}" aria-label="色${index + 1}"></button>
                      `,
                    )
                    .join("")}
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="actions">
          <button class="secondary" type="button" data-add-player ${state.players.length >= 8 ? "disabled" : ""}>追加</button>
          <button class="primary" type="button" data-nav="home">決定</button>
        </div>
      </div>
    </section>
  `;
}

function settingsScreen(gameId) {
  const game = games[gameId];
  if (gameId === "geo") {
    return `
      <section class="screen">
        ${topbar(game.title, "Game Setup")}
        <div class="content bottom-safe">
          ${playerStrip()}
          ${settingRow("ラウンド", "全員が同じ地点を回答", ["3", "5"], "3")}
          ${settingRow("時間", "1人ごとの回答時間", ["なし", "60", "90"], "60")}
          <div class="panel note-panel">
            <strong>出題地点は自動選択</strong>
            <span>Mapillary画像を見て、日本地図にピンを刺します。</span>
          </div>
          <button class="primary" type="button" data-geo-reset>はじめる</button>
        </div>
      </section>
    `;
  }
  if (gameId === "ito") {
    return `
      <section class="screen">
        ${topbar(game.title, "Game Setup")}
        <div class="content bottom-safe">
          ${playerStrip()}
          <div class="topic">一番テンションが上がる休日の過ごし方</div>
          ${settingRow("お題", "通常、変化球、恋愛などから出題", ["通常", "変化球", "恋愛"], "通常")}
          ${settingRow("会話", "数字を直接言わない", ["3分", "5分"], "5分")}
          <div class="panel note-panel">
            <strong>数字は1-100固定、手札は1人1枚</strong>
            <span>各プレイヤーは自分の数字だけを確認して会話します。</span>
          </div>
          <button class="primary" type="button" data-ito-reset>はじめる</button>
        </div>
      </section>
    `;
  }
  return `
    <section class="screen">
      ${topbar(game.title, "Game Setup")}
      <div class="content bottom-safe">
        ${playerStrip()}
        <div class="topic">使用カードはプレイヤー数+2枚</div>
        ${settingRow("基本役職", "村人、人狼、占い師、怪盗", ["固定"], "固定")}
        ${settingRow("議論", "投票前の会話時間", ["3分", "5分"], "3分")}
        <div class="panel note-panel">
          <strong>夜の順番</strong>
          <span>占い師、人狼、怪盗の行動後、昼の議論と投票に進みます。</span>
        </div>
        <button class="primary" type="button" data-wolf-reset>はじめる</button>
      </div>
    </section>
  `;
}

function settingRow(title, detail, options, active) {
  return `
    <div class="setting-row">
      <div class="setting-label">
        <strong>${title}</strong>
        <span>${detail}</span>
      </div>
      <div class="segmented">
        ${options.map((option) => `<button class="${option === active ? "active" : ""}" type="button">${option}</button>`).join("")}
      </div>
    </div>
  `;
}

function passScreen(sessionKey, nextScreen, label) {
  const player = currentPlayer(sessionKey);
  return `
    <section class="pass-screen">
      <div class="pass-card" style="--player-color:${player.color}">
        <div class="pass-sub">${label}</div>
        <div class="pass-name">${escapeHtml(player.name)}</div>
        <button class="primary" type="button" data-nav="${nextScreen}">画面を見る</button>
        <button class="ghost" type="button" data-nav="home">ゲーム一覧</button>
      </div>
    </section>
  `;
}

function geoPlayScreen() {
  const session = state.sessions.geo;
  const player = currentPlayer("geo");
  return `
    <section class="screen">
      ${topbar("ラウンド ${session.round}", "日本マップGuessr")}
      <div class="content bottom-safe">
        <div class="geo-view">
          <div class="geo-hud">
            <span class="hud-pill">${escapeHtml(player.name)}</span>
            <span class="hud-pill">00:48</span>
          </div>
        </div>
        <button class="primary" type="button" data-nav="geoMap">地図を開く</button>
      </div>
    </section>
  `;
}

function geoMapScreen() {
  return `
    <section class="screen">
      ${topbar("回答する", "日本マップGuessr")}
      <div class="content bottom-safe">
        <div class="map-panel">
          <span class="pin player-b" style="--pin-color:${currentPlayer("geo").color}"></span>
        </div>
        <div class="actions">
          <button class="secondary" type="button" data-nav="geoPlay">戻る</button>
          <button class="primary" type="button" data-geo-answer>回答する</button>
        </div>
      </div>
    </section>
  `;
}

function geoResultScreen() {
  return `
    <section class="screen">
      ${topbar("ラウンド結果", "日本マップGuessr")}
      <div class="content bottom-safe">
        <div class="map-panel">
          <span class="pin answer" style="--pin-color:#171717"></span>
          ${state.players
            .slice(0, 4)
            .map((player, index) => `<span class="pin player-${["a", "b", "c", "d"][index]}" style="--pin-color:${player.color}"></span>`)
            .join("")}
        </div>
        <div class="result-list">
          ${state.players
            .map((player, index) => {
              const result = geoScores[index];
              return `
                <div class="result-row">
                  <span class="dot" style="--chip-color:${player.color}"></span>
                  <strong>${escapeHtml(player.name)}</strong>
                  <div class="score">${result.score}<br /><small>${result.distance}</small></div>
                </div>
              `;
            })
            .join("")}
        </div>
        <div class="ad-slot">広告エリア</div>
        <button class="primary" type="button" data-nav="home">ゲーム一覧へ</button>
      </div>
    </section>
  `;
}

function itoRevealScreen() {
  const player = currentPlayer("ito");
  return `
    <section class="screen">
      ${topbar("数字確認", "ナンバートーク")}
      <div class="content bottom-safe">
        <div class="topic">一番テンションが上がる休日の過ごし方</div>
        <div class="number-card">
          <div>
            <div class="muted">${escapeHtml(player.name)}の数字</div>
            <div class="number">${itoNumbers[player.id] || 50}</div>
          </div>
        </div>
        <button class="primary" type="button" data-ito-next>隠して渡す</button>
      </div>
    </section>
  `;
}

function itoDiscussScreen() {
  return `
    <section class="screen">
      ${topbar("会話", "ナンバートーク")}
      <div class="content bottom-safe">
        <div class="topic">一番テンションが上がる休日の過ごし方</div>
        <div class="timer">04:12</div>
        ${playerStrip()}
        <button class="primary" type="button" data-nav="itoOrder">並び順を決める</button>
      </div>
    </section>
  `;
}

function itoOrderScreen() {
  const order = state.sessions.ito.order.filter((id) => state.players.some((player) => player.id === id));
  state.players.forEach((player) => {
    if (!order.includes(player.id)) order.push(player.id);
  });
  return `
    <section class="screen">
      ${topbar("並び順", "ナンバートーク")}
      <div class="content bottom-safe">
        <div class="topic">小さいと思う順に並べる</div>
        <div class="order-list">
          ${order
            .map((id, index) => {
              const player = state.players.find((item) => item.id === id);
              return `
                <div class="order-item">
                  <span class="dot" style="--chip-color:${player.color}"></span>
                  <strong>${escapeHtml(player.name)}</strong>
                  <button class="small-button" type="button" data-move-order="${index}" data-dir="-1">↑</button>
                  <button class="small-button" type="button" data-move-order="${index}" data-dir="1">↓</button>
                </div>
              `;
            })
            .join("")}
        </div>
        <button class="primary" type="button" data-nav="itoResult">公開する</button>
      </div>
    </section>
  `;
}

function itoResultScreen() {
  const order = state.sessions.ito.order.filter((id) => state.players.some((player) => player.id === id));
  return `
    <section class="screen">
      ${topbar("結果", "ナンバートーク")}
      <div class="content bottom-safe">
        <div class="result-list">
          ${order
            .map((id) => {
              const player = state.players.find((item) => item.id === id);
              return `
                <div class="result-row">
                  <span class="dot" style="--chip-color:${player.color}"></span>
                  <strong>${escapeHtml(player.name)}</strong>
                  <div class="score">${itoNumbers[player.id] || 50}</div>
                </div>
              `;
            })
            .join("")}
        </div>
        <div class="ad-slot">広告エリア</div>
        <button class="primary" type="button" data-nav="home">ゲーム一覧へ</button>
      </div>
    </section>
  `;
}

function wolfRoleScreen() {
  const player = currentPlayer("wolf");
  const role = wolfRoles[player.id] || wolfRoles.p4;
  return `
    <section class="screen">
      ${topbar("役職確認", "ワンナイト人狼")}
      <div class="content bottom-safe">
        <div class="role-card">
          <div>
            <div class="role-symbol">${role.mark}</div>
            <h2 class="role-name">${role.name}</h2>
            <p class="muted">${role.text}</p>
          </div>
        </div>
        <button class="primary" type="button" data-wolf-next-role>隠して渡す</button>
      </div>
    </section>
  `;
}

function wolfNightScreen() {
  return `
    <section class="screen">
      ${topbar("夜", "ワンナイト人狼")}
      <div class="content bottom-safe">
        <div class="role-card">
          <div>
            <div class="role-symbol">月</div>
            <h2 class="role-name">夜行動</h2>
            <p class="muted">占い師、人狼、怪盗の順に行動します。中央の2枚は誰にも配られていないカードです。</p>
          </div>
        </div>
        <button class="primary" type="button" data-nav="wolfDiscuss">議論へ</button>
      </div>
    </section>
  `;
}

function wolfDiscussScreen() {
  return `
    <section class="screen">
      ${topbar("議論", "ワンナイト人狼")}
      <div class="content bottom-safe">
        <div class="timer">02:36</div>
        ${playerStrip()}
        <button class="primary" type="button" data-wolf-start-vote>投票へ</button>
      </div>
    </section>
  `;
}

function wolfVoteScreen() {
  const player = currentPlayer("wolf");
  return `
    <section class="screen">
      ${topbar("投票", "ワンナイト人狼")}
      <div class="content bottom-safe">
        <div class="pass-sub">${escapeHtml(player.name)}の投票</div>
        <div class="vote-grid">
          ${state.players
            .map(
              (target) => `
                <button class="vote-button" type="button" data-wolf-vote="${target.id}">
                  <span class="dot" style="--chip-color:${target.color}"></span>
                  ${escapeHtml(target.name)}
                </button>
              `,
            )
            .join("")}
          <button class="vote-button" type="button" data-wolf-vote="peace">平和村</button>
        </div>
      </div>
    </section>
  `;
}

function wolfResultScreen() {
  return `
    <section class="screen">
      ${topbar("結果", "ワンナイト人狼")}
      <div class="content bottom-safe">
        <div class="topic">村チームの勝利</div>
        <div class="result-list">
          ${state.players
            .map((player, index) => {
              const role = wolfRoles[player.id] || wolfRoles.p4;
              const voted = state.players[(index + 1) % state.players.length];
              return `
                <div class="ranking-row">
                  <span class="dot" style="--chip-color:${player.color}"></span>
                  <strong>${escapeHtml(player.name)}<br /><small class="muted">${role.name}</small></strong>
                  <div class="score"><small>投票</small><br />${escapeHtml(voted.name)}</div>
                </div>
              `;
            })
            .join("")}
        </div>
        <div class="ad-slot">広告エリア</div>
        <button class="primary" type="button" data-nav="home">ゲーム一覧へ</button>
      </div>
    </section>
  `;
}

function render() {
  const screens = {
    home: homeScreen,
    players: playersScreen,
    geoSettings: () => settingsScreen("geo"),
    itoSettings: () => settingsScreen("ito"),
    wolfSettings: () => settingsScreen("wolf"),
    geoPass: () => passScreen("geo", "geoPlay", `ラウンド ${state.sessions.geo.round}`),
    geoPlay: geoPlayScreen,
    geoMap: geoMapScreen,
    geoResult: geoResultScreen,
    itoPass: () => passScreen("ito", "itoReveal", "数字確認"),
    itoReveal: itoRevealScreen,
    itoDiscuss: itoDiscussScreen,
    itoOrder: itoOrderScreen,
    itoResult: itoResultScreen,
    wolfPass: () => passScreen("wolf", "wolfRole", "役職確認"),
    wolfRole: wolfRoleScreen,
    wolfNight: wolfNightScreen,
    wolfDiscuss: wolfDiscussScreen,
    wolfVotePass: () => passScreen("wolf", "wolfVote", "投票"),
    wolfVote: wolfVoteScreen,
    wolfResult: wolfResultScreen,
  };
  app.innerHTML = screens[state.screen] ? screens[state.screen]() : homeScreen();
}

function nextSecret(sessionKey, doneScreen) {
  const session = state.sessions[sessionKey];
  if (session.playerIndex < state.players.length - 1) {
    session.playerIndex += 1;
    setScreen(`${sessionKey}Pass`);
  } else {
    setScreen(doneScreen);
  }
}

function resetSession(gameId) {
  if (gameId === "geo") {
    state.sessions.geo = { playerIndex: 0, round: 1, answered: [], mapOpen: false };
    setScreen("geoPass", "geo");
  }
  if (gameId === "ito") {
    state.sessions.ito = { playerIndex: 0, revealed: [], order: state.players.map((player) => player.id), phase: "reveal" };
    setScreen("itoPass", "ito");
  }
  if (gameId === "wolf") {
    state.sessions.wolf = { playerIndex: 0, revealed: [], votes: [], phase: "role" };
    setScreen("wolfPass", "wolf");
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  const nav = target.dataset.nav;
  if (nav) {
    setScreen(nav);
    return;
  }

  const startGame = target.dataset.startGame;
  if (startGame) {
    setScreen(`${startGame}Settings`, startGame);
    return;
  }

  if (target.dataset.addPlayer !== undefined) {
    if (state.players.length < 8) {
      const index = state.players.length + 1;
      state.players.push({ id: `p${index}`, name: `ゲスト${index}`, color: colors[(index - 1) % colors.length] });
      render();
    }
    return;
  }

  const removeId = target.dataset.removePlayer;
  if (removeId && state.players.length > 2) {
    state.players = state.players.filter((player) => player.id !== removeId);
    render();
    return;
  }

  const colorId = target.dataset.playerColor;
  if (colorId) {
    const player = state.players.find((item) => item.id === colorId);
    if (player) player.color = target.dataset.color;
    render();
    return;
  }

  if (target.dataset.geoReset !== undefined) {
    resetSession("geo");
    return;
  }

  if (target.dataset.itoReset !== undefined) {
    resetSession("ito");
    return;
  }

  if (target.dataset.wolfReset !== undefined) {
    resetSession("wolf");
    return;
  }

  if (target.dataset.geoAnswer !== undefined) {
    const session = state.sessions.geo;
    session.answered.push(currentPlayer("geo").id);
    if (session.playerIndex < state.players.length - 1) {
      session.playerIndex += 1;
      setScreen("geoPass");
    } else {
      setScreen("geoResult");
    }
    return;
  }

  if (target.dataset.itoNext !== undefined) {
    nextSecret("ito", "itoDiscuss");
    return;
  }

  const orderIndex = target.dataset.moveOrder;
  if (orderIndex !== undefined) {
    const index = Number(orderIndex);
    const direction = Number(target.dataset.dir);
    const nextIndex = index + direction;
    const order = state.sessions.ito.order;
    if (nextIndex >= 0 && nextIndex < order.length) {
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      render();
    }
    return;
  }

  if (target.dataset.wolfNextRole !== undefined) {
    nextSecret("wolf", "wolfNight");
    return;
  }

  if (target.dataset.wolfStartVote !== undefined) {
    state.sessions.wolf.playerIndex = 0;
    state.sessions.wolf.votes = [];
    setScreen("wolfVotePass");
    return;
  }

  const voteTarget = target.dataset.wolfVote;
  if (voteTarget) {
    const session = state.sessions.wolf;
    session.votes.push({ from: currentPlayer("wolf").id, to: voteTarget });
    if (session.playerIndex < state.players.length - 1) {
      session.playerIndex += 1;
      setScreen("wolfVotePass");
    } else {
      setScreen("wolfResult");
    }
  }
});

app.addEventListener("input", (event) => {
  const input = event.target.closest("input[data-player-name]");
  if (!input) return;
  const player = state.players.find((item) => item.id === input.dataset.playerName);
  if (player) player.name = input.value || "名無し";
});

render();
