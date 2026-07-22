import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGuestPlayer, normalizePlayerList } from "../components/PlayerSetup";
import { canShowAds } from "../core/adPolicy";
import { distanceMeters, geoScore } from "../core/distance";
import { gameDefinitions, games, getGameDefinition } from "../core/gameRegistry";
import { sanitizeReloadPhase } from "../core/reloadSafety";
import {
  clearAppState,
  clearGameSession,
  gameSessionKey,
  loadAppState,
  loadGameSession,
  loadPlayers,
  saveAppState,
  saveGameSession,
  savePlayers
} from "../core/storage";
import { DEFAULT_PLAYERS, type AdContext, type GameId, type Player } from "../core/types";
import { fallbackGeoLocations } from "../data/geoLocations";
import { createGeoAnswer, createGeoState, currentGeoLocation, defaultGeoConfig, replaceCurrentGeoLocation } from "../games/geoGuessr";
import { createNumberTalkState, defaultNumberTalkConfig, isNumberOrderCorrect, type NumberTalkState } from "../games/numberTalk";
import {
  applyRobberAction,
  applySeerAction,
  buildRoleSet,
  countRoleCards,
  defaultWerewolfConfig,
  judgeWerewolf,
  normalizeWerewolfConfig,
  normalizeRoleCounts,
  resolveWerewolfNightActions,
  type RoleCounts,
  type WerewolfState
} from "../games/werewolf";
import { createRankingAnswersState, defaultRankingAnswersConfig } from "../games/rankingAnswers";
import { createMajorityMatchState, defaultMajorityMatchConfig, scoreMajorityMatchRound, submitMajorityMatchAnswer } from "../games/majorityMatch";
import { activeOneWordClues, createOneWordClueState, currentOneWordClueRound, defaultOneWordClueConfig, submitOneWordClue, submitOneWordGuess, toggleOneWordClueCancelled } from "../games/oneWordClue";
import { hasSpyLocationAccusationConsensus, type SpyLocationState } from "../games/spyLocation";
import {
  advanceSpectrumRound,
  createSpectrumMeterState,
  currentSpectrumRound,
  defaultSpectrumMeterConfig,
  otherSpectrumTeam,
  scoreSpectrumGuess,
  scoreSpectrumRound,
  updateCurrentSpectrumRound
} from "../games/spectrumMeter";
import { judgeWordInfiltrator, type WordInfiltratorState } from "../games/wordInfiltrator";
import { createFakeArtistState, judgeFakeArtist, type FakeArtistState } from "../games/fakeArtist";
import {
  canCalculateSettlement,
  createSettlementTransfers,
  formatBillCopy,
  splitBill,
  summarizeBillSplitDay,
  type BillSplitBill,
  type BillSplitDay,
  type BillSplitParticipant
} from "../tools/billSplit";
import { BILL_SPLIT_MAX_AGE_MS, clearBillSplitDay, loadBillSplitDay, saveBillSplitDay } from "../tools/billSplitStorage";
import { flipCoin, formatWheelLabel, MAX_WHEEL_ITEM_CODE_UNITS, MAX_WHEEL_ITEM_GRAPHEMES, MAX_WHEEL_ITEMS, normalizeWheelItems, pickWheelIndex, randomInt, rollDice } from "../tools/randomTools";
import { loadWheelItemsText, saveWheelItemsText } from "../tools/randomToolsStorage";

const players = DEFAULT_PLAYERS.slice(0, 4);
const fivePlayers: Player[] = [...players, { id: "p5", nickname: "ソラ", color: "#e76f51" }];

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Player profiles", () => {
  it("caps persisted players at eight and creates predictable guest defaults", () => {
    const manyPlayers = Array.from({ length: 10 }, (_item, index) => createGuestPlayer(index + 1, 1_700_000_000_000));

    expect(normalizePlayerList(manyPlayers)).toHaveLength(8);
    expect(createGuestPlayer(5, 1_700_000_000_000)).toMatchObject({
      id: "p5-loyw3v28",
      nickname: "ゲスト5",
      color: "#2d7d46"
    });
  });
});

describe("Game registry", () => {
  it("resolves every registered game and keeps player ranges sane", () => {
    expect(games).toHaveLength(11);
    const ids = new Set<GameId>();
    games.forEach((game) => {
      ids.add(game.id);
      expect(getGameDefinition(game.id).title).toBe(game.title);
      expect(game.minPlayers).toBeGreaterThanOrEqual(1);
      expect(game.maxPlayers).toBeLessThanOrEqual(8);
      expect(game.minPlayers).toBeLessThanOrEqual(game.maxPlayers);
    });
    expect(ids.size).toBe(games.length);
  });

  it("creates an initial state for every game definition", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    for (const game of games) {
      const roster = fivePlayers.slice(0, Math.max(game.minPlayers, 2));
      const definition = gameDefinitions[game.id] as {
        defaultConfig: () => unknown;
        createState: (params: { players: Player[]; config: unknown; seed: string }) => unknown | Promise<unknown>;
      };
      const state = await definition.createState({ players: roster, config: definition.defaultConfig(), seed: `test:${game.id}` });

      expect(state).toBeTruthy();
      if (typeof state === "object" && state && "phase" in state) {
        expect(String(state.phase)).not.toBe("result");
      }
    }
  });
});

describe("Storage", () => {
  it("falls back on corrupt player data and keeps game sessions isolated", () => {
    localStorage.setItem("party:v1:players", "{broken");
    expect(loadPlayers()).toEqual(DEFAULT_PLAYERS);

    savePlayers(Array.from({ length: 10 }, (_item, index) => createGuestPlayer(index + 1, 10)));
    expect(loadPlayers()).toHaveLength(8);

    saveAppState({ screen: "home" });
    expect(loadAppState<{ screen: string }>()?.screen).toBe("home");
    clearAppState();
    expect(loadAppState()).toBeNull();

    saveGameSession({ sessionId: "s1", gameId: "number-talk", state: { phase: "handoff" }, createdAt: "c", updatedAt: "u" });
    expect(gameSessionKey("s1", "number-talk")).toBe("party:v1:sessions:s1:game:number-talk");
    expect(loadGameSession<{ phase: string }>("s1", "number-talk")?.state.phase).toBe("handoff");
    expect(loadGameSession("s1", "werewolf")).toBeNull();
    clearGameSession({ sessionId: "s1", gameId: "number-talk" });
    expect(loadGameSession("s1", "number-talk")).toBeNull();
  });

  it("keeps the app usable when storage writes and removals are denied", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => savePlayers(players)).not.toThrow();
    expect(() => saveAppState({ screen: "home" })).not.toThrow();
    expect(() => saveGameSession({ sessionId: "s1", gameId: "number-talk", state: {}, createdAt: "c", updatedAt: "u" })).not.toThrow();
    expect(setItem).toHaveBeenCalledTimes(3);
    setItem.mockRestore();

    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => clearAppState()).not.toThrow();
    expect(() => clearGameSession({ sessionId: "s1", gameId: "number-talk" })).not.toThrow();
    expect(removeItem).toHaveBeenCalledTimes(2);
  });
});

describe("Bill split", () => {
  const splitPlayers: BillSplitParticipant[] = players.slice(0, 3).map((player) => ({ ...player, weight: 1 }));

  it("splits equal and weighted bills to the exact yen", () => {
    const equal = splitBill(10_000, splitPlayers, sequenceRandom([0.9, 0.1, 0.5]));
    expect(equal.map((share) => share.amountYen)).toEqual([3333, 3334, 3333]);
    expect(equal.reduce((sum, share) => sum + share.amountYen, 0)).toBe(10_000);
    expect(equal.filter((share) => share.receivedRemainder).map((share) => share.id)).toEqual(["p2"]);

    const weighted = splitBill(10_000, [
      { ...players[0], weight: 1 },
      { ...players[1], weight: 1 },
      { ...players[2], weight: 0.5, reducedReason: "non-drinker" }
    ]);
    expect(weighted.map((share) => share.amountYen)).toEqual([4000, 4000, 2000]);
  });

  it("assigns every remainder yen once and rounds weighted shares by the largest remainder", () => {
    const equal = splitBill(10_001, splitPlayers, sequenceRandom([0.8, 0.2, 0.5]));
    expect(equal.map((share) => share.amountYen)).toEqual([3333, 3334, 3334]);
    expect(equal.filter((share) => share.receivedRemainder)).toHaveLength(2);

    const weighted = splitBill(3_001, [
      { ...players[0], weight: 1.5 },
      { ...players[1], weight: 1 },
      { ...players[2], weight: 0.5 }
    ], sequenceRandom([0.9, 0.1, 0.5]));
    expect(weighted.map((share) => share.amountYen)).toEqual([1501, 1000, 500]);
  });

  it("preserves split invariants across totals, roster sizes, and weights", () => {
    const totals = [1, 2, 3, 10, 999, 10_000, 10_001, 999_999];
    const weights: BillSplitParticipant["weight"][] = [0.5, 1, 1.5];
    for (const totalYen of totals) {
      for (let count = 2; count <= 8; count += 1) {
        const roster = Array.from({ length: count }, (_item, index) => ({
          id: `i${index}`,
          nickname: `P${index}`,
          color: "#000",
          weight: weights[index % weights.length]
        }));
        const shares = splitBill(totalYen, roster, sequenceRandom(Array.from({ length: count }, (_item, index) => index / count)));
        expect(shares.reduce((sum, share) => sum + share.amountYen, 0)).toBe(totalYen);
        expect(shares.every((share) => Number.isSafeInteger(share.amountYen) && share.amountYen >= 0)).toBe(true);
        const totalWeight = roster.reduce((sum, participant) => sum + participant.weight, 0);
        shares.forEach((share) => {
          const exact = totalYen * share.weight / totalWeight;
          expect(Math.abs(share.amountYen - exact)).toBeLessThan(1);
        });
      }
    }
  });

  it("rejects invalid totals, rosters, weights, and unsafe multiplication", () => {
    expect(() => splitBill(0, splitPlayers)).toThrow("1円以上");
    expect(() => splitBill(100, splitPlayers.slice(0, 1))).toThrow("2人以上");
    expect(() => splitBill(100, [splitPlayers[0], splitPlayers[0]])).toThrow("重複");
    expect(() => splitBill(100, [{ ...splitPlayers[0], weight: 2 as BillSplitParticipant["weight"] }, splitPlayers[1]])).toThrow("無効");
    expect(() => splitBill(Number.MAX_SAFE_INTEGER, [{ ...splitPlayers[0], weight: 1.5 }, splitPlayers[1]])).toThrow("大きすぎ");
  });

  it("aggregates shops and creates a balanced final settlement", () => {
    const first = createBill("b1", "1軒目", 12_000, "p1", [4000, 4000, 2000, 2000]);
    const second = createBill("b2", "2軒目", 8_000, "p2", [2667, 2667, 0, 2666]);
    const day: BillSplitDay = { version: 1, id: "day", startedAt: "2026-07-17T00:00:00.000Z", updatedAt: "2026-07-17T00:00:00.000Z", bills: [first, second] };
    const rows = summarizeBillSplitDay(day);

    expect(rows.map((row) => [row.player.id, row.shareYen, row.paidYen])).toEqual([
      ["p1", 6667, 12000],
      ["p2", 6667, 8000],
      ["p3", 2000, 0],
      ["p4", 4666, 0]
    ]);
    expect(canCalculateSettlement(day)).toBe(true);
    const transfers = createSettlementTransfers(rows);
    expect(transfers.reduce((sum, transfer) => sum + transfer.amountYen, 0)).toBe(6666);
    expect(transfers).toEqual([
      { fromPlayerId: "p4", toPlayerId: "p1", amountYen: 4666 },
      { fromPlayerId: "p3", toPlayerId: "p1", amountYen: 667 },
      { fromPlayerId: "p3", toPlayerId: "p2", amountYen: 1333 }
    ]);
    expect(formatBillCopy(first)).toContain("合計：12,000円");
  });

  it("gates incomplete settlement and leaves every balance at zero after transfers", () => {
    const first = createBill("b1", "1軒目", 12_000, "p1", [4000, 4000, 2000, 2000]);
    const missingPayer = { ...createBill("b2", "2軒目", 8_000, "p2", [2667, 2667, 0, 2666]), payerId: null };
    const incomplete: BillSplitDay = { version: 1, id: "day", startedAt: "2026-07-17T00:00:00.000Z", updatedAt: "2026-07-17T00:00:00.000Z", bills: [first, missingPayer] };
    expect(canCalculateSettlement(incomplete)).toBe(false);

    const complete = { ...incomplete, bills: [first, { ...missingPayer, payerId: "p2" }] };
    const rows = summarizeBillSplitDay(complete);
    const remaining = new Map(rows.map((row) => [row.player.id, row.netYen]));
    for (const transfer of createSettlementTransfers(rows)) {
      remaining.set(transfer.fromPlayerId, (remaining.get(transfer.fromPlayerId) ?? 0) + transfer.amountYen);
      remaining.set(transfer.toPlayerId, (remaining.get(transfer.toPlayerId) ?? 0) - transfer.amountYen);
    }
    expect([...remaining.values()]).toEqual([0, 0, 0, 0]);

    const settledRows = rows.map((row) => ({ ...row, paidYen: row.shareYen, netYen: 0 }));
    expect(createSettlementTransfers(settledRows)).toEqual([]);
  });

  it("restores a recent day and clears expired data", () => {
    const now = Date.parse("2026-07-17T12:00:00.000Z");
    const day: BillSplitDay = { version: 1, id: "day", startedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), bills: [] };
    saveBillSplitDay(day);
    expect(loadBillSplitDay(now)?.id).toBe("day");
    expect(loadBillSplitDay(now + BILL_SPLIT_MAX_AGE_MS + 1)).toBeNull();
    expect(localStorage.getItem("party:v1:bill-split-day")).toBeNull();
    saveBillSplitDay(day);
    clearBillSplitDay();
    expect(loadBillSplitDay(now)).toBeNull();
  });

  it("clears corrupt, unsupported, and structurally invalid saved days", () => {
    localStorage.setItem("party:v1:bill-split-day", "{broken");
    expect(loadBillSplitDay()).toBeNull();

    localStorage.setItem("party:v1:bill-split-day", JSON.stringify({ version: 2, id: "old", startedAt: "x", updatedAt: new Date().toISOString(), bills: [] }));
    expect(loadBillSplitDay()).toBeNull();

    localStorage.setItem("party:v1:bill-split-day", JSON.stringify({
      version: 1,
      id: "bad",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      bills: [{ ...createBill("b1", "1軒目", 100, "p1", [25, 25, 25, 25]), shares: [] }]
    }));
    expect(loadBillSplitDay()).toBeNull();
  });
});

describe("Random tools", () => {
  it("normalizes wheel candidates and caps them at twenty", () => {
    const input = Array.from({ length: 24 }, (_item, index) => `  候補${index + 1}  `).join("\n\n");
    const items = normalizeWheelItems(input);

    expect(items).toHaveLength(MAX_WHEEL_ITEMS);
    expect(items[0]).toBe("候補1");
    expect(items[MAX_WHEEL_ITEMS - 1]).toBe("候補20");
  });

  it("caps stored labels by grapheme and truncates emoji display without corruption", () => {
    const family = "👨‍👩‍👧‍👦";
    const normalized = normalizeWheelItems(`${"😀".repeat(MAX_WHEEL_ITEM_GRAPHEMES + 5)}\n通常`);

    expect(Array.from(normalized[0])).toHaveLength(MAX_WHEEL_ITEM_GRAPHEMES);
    expect(formatWheelLabel(family.repeat(9))).toBe(`${family.repeat(8)}…`);
    expect(formatWheelLabel(family.repeat(8))).toBe(family.repeat(8));
  });

  it("maps deterministic random values to wheel, coin, and dice boundaries", () => {
    expect(pickWheelIndex(2, () => 0.999999)).toBe(1);
    expect(pickWheelIndex(4, () => 0)).toBe(0);
    expect(pickWheelIndex(4, () => 0.999999)).toBe(3);
    expect(pickWheelIndex(MAX_WHEEL_ITEMS, () => 0.999999)).toBe(MAX_WHEEL_ITEMS - 1);
    expect(flipCoin(() => 0)).toBe("heads");
    expect(flipCoin(() => 0.999999)).toBe("tails");
    expect(rollDice(1, () => 0)).toEqual([1]);
    expect(rollDice(2, sequenceRandom([0, 0.999999]))).toEqual([1, 6]);
    expect(rollDice(3, sequenceRandom([0, 0.5, 0.999999]))).toEqual([1, 4, 6]);
  });

  it("keeps repeated random outputs within each tool range", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(pickWheelIndex(20)).toBeGreaterThanOrEqual(0);
      expect(pickWheelIndex(20)).toBeLessThan(20);
      expect(["heads", "tails"]).toContain(flipCoin());
      expect(rollDice(3).every((value) => value >= 1 && value <= 6)).toBe(true);
    }
  });

  it("rejects invalid counts and injected random values", () => {
    expect(() => pickWheelIndex(1)).toThrow("2件");
    expect(() => pickWheelIndex(21)).toThrow("20件");
    expect(() => rollDice(0)).toThrow("1個");
    expect(() => rollDice(4)).toThrow("3個");
    expect(() => randomInt(6, () => 1)).toThrow("乱数値");
    expect(() => randomInt(6, () => -0.1)).toThrow("乱数値");
  });

  it("rejects out-of-range crypto values and falls back when crypto is unavailable", () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = getRandomValues.mock.calls.length === 1 ? 0xffffffff : 7;
      return values;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(randomInt(6)).toBe(1);
    expect(getRandomValues).toHaveBeenCalledTimes(2);

    vi.stubGlobal("crypto", undefined);
    const mathRandom = vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(randomInt(6)).toBe(3);
    mathRandom.mockRestore();
  });

  it("stores wheel candidates locally and tolerates unavailable storage", () => {
    const oversized = Array.from({ length: MAX_WHEEL_ITEMS + 4 }, (_item, index) => `${index}:${"あ".repeat(MAX_WHEEL_ITEM_GRAPHEMES + 5)}`).join("\n");
    saveWheelItemsText(oversized);
    const savedItems = loadWheelItemsText().split("\n");
    expect(savedItems).toHaveLength(MAX_WHEEL_ITEMS);
    expect(savedItems.every((item) => Array.from(item).length <= MAX_WHEEL_ITEM_GRAPHEMES)).toBe(true);
    expect(savedItems.every((item) => item.length <= MAX_WHEEL_ITEM_CODE_UNITS)).toBe(true);

    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("quota"); });
    expect(() => saveWheelItemsText("保存不可")).not.toThrow();
  });

  it("returns an empty candidate list when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => { throw new Error("denied"); });
    expect(loadWheelItemsText()).toBe("");
  });
});

describe("Geo scoring", () => {
  it("scores exact guesses and resets stale pending guesses when replacing a location", () => {
    expect(distanceMeters({ lat: 35, lng: 139 }, { lat: 35, lng: 139 })).toBe(0);
    expect(geoScore(0)).toBe(5000);
    expect(geoScore(1_000_000)).toBeLessThan(50);

    const state = createGeoState(players, defaultGeoConfig(), "geo-test", fallbackGeoLocations);
    const location = currentGeoLocation(state);
    const answer = createGeoAnswer(state, players[0].id, { lat: location.lat, lng: location.lng });
    expect(answer.score).toBe(5000);

    const replaced = replaceCurrentGeoLocation({ ...state, pendingGuess: { lat: 1, lng: 2 } }, fallbackGeoLocations[1]);
    expect(currentGeoLocation(replaced).id).toBe(fallbackGeoLocations[1].id);
    expect(replaced.pendingGuess).toBeUndefined();
  });
});

describe("Number Talk", () => {
  it("deals one unique 1-100 number per player and judges ascending order", () => {
    const state = createNumberTalkState(players, defaultNumberTalkConfig(), "number-test");
    expect(new Set(state.assignments.map((assignment) => assignment.number)).size).toBe(players.length);
    expect(state.assignments.every((assignment) => assignment.number >= 1 && assignment.number <= 100)).toBe(true);

    const ordered: NumberTalkState = {
      ...state,
      order: [...state.assignments].sort((a, b) => a.number - b.number).map((assignment) => assignment.playerId)
    };
    expect(isNumberOrderCorrect(ordered)).toBe(true);
    expect(isNumberOrderCorrect({ ...ordered, order: [...ordered.order].reverse() })).toBe(players.length <= 1);
  });
});

describe("Werewolf", () => {
  it("keeps role counts aligned when player count shrinks", () => {
    const fourPlayerConfig = defaultWerewolfConfig();
    const threePlayerConfig = normalizeWerewolfConfig(fourPlayerConfig, 3);

    expect(countRoleCards(fourPlayerConfig.roleCounts)).toBe(6);
    expect(countRoleCards(threePlayerConfig.roleCounts)).toBe(5);
    expect(buildRoleSet(3, threePlayerConfig.roleCounts)).toHaveLength(5);
  });

  it("normalizes role counts, applies robber swaps, and judges executed wolves", () => {
    const counts: RoleCounts = normalizeRoleCounts({ werewolf: 1, seer: 1, robber: 1 }, 6);
    expect(countRoleCards(counts)).toBe(6);
    expect(buildRoleSet(4, counts)).toHaveLength(6);

    const state = {
      phase: "vote" as const,
      config: defaultWerewolfConfig(),
      currentPlayerIndex: 0,
      playerInitialCards: { p1: "robber", p2: "werewolf", p3: "villager", p4: "seer" },
      playerCurrentCards: { p1: "robber", p2: "werewolf", p3: "villager", p4: "seer" },
      centerCards: ["villager", "villager"] as ["villager", "villager"],
      roleRevealDonePlayerIds: [],
      nightActions: [],
      votes: [
        { fromPlayerId: "p1", targetType: "player", targetPlayerId: "p2" },
        { fromPlayerId: "p2", targetType: "player", targetPlayerId: "p3" },
        { fromPlayerId: "p3", targetType: "player", targetPlayerId: "p2" },
        { fromPlayerId: "p4", targetType: "player", targetPlayerId: "p2" }
      ]
    } satisfies WerewolfState;

    expect(judgeWerewolf(state, players).winningTeam).toBe("human");
    applyRobberAction(state, "p1", "p2");
    expect(state.playerCurrentCards.p1).toBe("robber");
    expect(state.playerCurrentCards.p2).toBe("werewolf");
    resolveWerewolfNightActions(state);
    expect(state.playerCurrentCards.p1).toBe("werewolf");
    expect(state.playerCurrentCards.p2).toBe("robber");
  });

  it("keeps seer information in official order even when the phone is passed by player order", () => {
    const state: WerewolfState = {
      phase: "nightAction" as const,
      config: defaultWerewolfConfig(),
      currentPlayerIndex: 0,
      playerInitialCards: { p1: "robber", p2: "seer", p3: "werewolf", p4: "villager" },
      playerCurrentCards: { p1: "robber", p2: "seer", p3: "werewolf", p4: "villager" },
      centerCards: ["villager", "villager"] as ["villager", "villager"],
      roleRevealDonePlayerIds: [],
      nightActions: [],
      votes: []
    };

    applyRobberAction(state, "p1", "p3");
    applySeerAction(state, "p2", { mode: "player", targetPlayerId: "p3" });

    const seerAction = state.nightActions.find((action) => action.type === "seer");
    expect(seerAction && "seenRole" in seerAction ? seerAction.seenRole : null).toBe("werewolf");

    resolveWerewolfNightActions(state);
    expect(state.playerCurrentCards.p1).toBe("werewolf");
    expect(state.playerCurrentCards.p3).toBe("robber");
  });
});

describe("Reference-aligned table game rules", () => {
  it("runs Spectrum Meter as two teams with the official scoring and catch-up turn", () => {
    const state = createSpectrumMeterState(players, defaultSpectrumMeterConfig(), "spectrum-team-test");
    expect(state.teamPlayerIds.a).toHaveLength(2);
    expect(state.teamPlayerIds.b).toHaveLength(2);
    expect(state.teamScores).toEqual({ a: 0, b: 1 });
    expect(scoreSpectrumGuess(50, 68)).toBe(0);

    const round = currentSpectrumRound(state);
    const exactGuess = updateCurrentSpectrumRound({ ...state, teamScores: { a: 0, b: 9 } }, { guessValue: round.targetValue });
    const scored = scoreSpectrumRound(exactGuess, "left");
    expect(scored.teamScores[round.activeTeamId]).toBe(4);
    expect(scored.teamScores[otherSpectrumTeam(round.activeTeamId)]).toBe(9);
    expect(currentSpectrumRound(advanceSpectrumRound(scored)).activeTeamId).toBe(round.activeTeamId);
  });

  it("gives the opposing Spectrum Meter team one point for a correct side guess except on a bullseye", () => {
    const state = createSpectrumMeterState(players, defaultSpectrumMeterConfig(), "spectrum-side-test");
    const round = currentSpectrumRound(state);
    const activeTeamId = round.activeTeamId;
    const opponentTeamId = otherSpectrumTeam(activeTeamId);
    const targetValue = 60;

    const closeGuess = updateCurrentSpectrumRound(
      {
        ...state,
        rounds: [{ ...round, targetValue }]
      },
      { guessValue: 50 }
    );
    const scoredSide = scoreSpectrumRound(closeGuess, "right");
    expect(scoredSide.teamScores[activeTeamId]).toBe(3);
    expect(scoredSide.teamScores[opponentTeamId]).toBe(2);

    const bullseye = scoreSpectrumRound(updateCurrentSpectrumRound({ ...state, rounds: [{ ...round, targetValue }] }, { guessValue: targetValue }), "left");
    expect(bullseye.teamScores[activeTeamId]).toBe(4);
    expect(bullseye.teamScores[opponentTeamId]).toBe(1);
  });

  it("starts Spectrum Meter sudden death on a tied ten-point score and ends it after both teams play", () => {
    const state = createSpectrumMeterState(players, defaultSpectrumMeterConfig(), "spectrum-sudden-death-test");
    const won = advanceSpectrumRound({ ...state, phase: "roundResult", teamScores: { a: 10, b: 8 } });
    expect(won.phase).toBe("final");
    expect(won.winningTeamId).toBe("a");

    const tied = {
      ...state,
      phase: "roundResult" as const,
      teamScores: { a: 10, b: 10 }
    };
    const suddenDeath = advanceSpectrumRound(tied);
    expect(suddenDeath.suddenDeathTurnsRemaining).toBe(2);

    const afterFirstTurn = advanceSpectrumRound({ ...suddenDeath, phase: "roundResult", teamScores: { a: 11, b: 10 } });
    expect(afterFirstTurn.phase).toBe("psychicHandoff");
    expect(afterFirstTurn.suddenDeathTurnsRemaining).toBe(1);

    const final = advanceSpectrumRound({ ...afterFirstTurn, phase: "roundResult", teamScores: { a: 12, b: 10 } });
    expect(final.phase).toBe("final");
    expect(final.winningTeamId).toBe("a");
  });

  it("uses one Ranking Answers mistake token per player", () => {
    const state = createRankingAnswersState(players, defaultRankingAnswersConfig(), "ranking-token-test");
    expect(state.config.mistakeLimit).toBe(players.length);
  });

  it("requires everyone except the accused to agree in Spy Location accusations", () => {
    const state = {
      phase: "accusationVote" as const,
      config: { locationCategory: "all" as const, questionTimeSec: 480 as const },
      location: { id: "airport", name: "空港", category: "travel" as const, categoryLabel: "移動", hint: "移動が多い場所", enabled: true },
      spyPlayerId: "p1",
      currentPlayerIndex: 0,
      revealViewedPlayerIds: [],
      accusedPlayerId: "p1",
      spyGuessLocationId: undefined,
      accusationVotes: [
        { fromPlayerId: "p2", agrees: true },
        { fromPlayerId: "p3", agrees: true },
        { fromPlayerId: "p4", agrees: false }
      ]
    } satisfies SpyLocationState;

    expect(hasSpyLocationAccusationConsensus(state, players.length)).toBe(false);
    expect(
      hasSpyLocationAccusationConsensus(
        {
          ...state,
          accusationVotes: state.accusationVotes.map((vote) => ({ ...vote, agrees: true }))
        },
        players.length
      )
    ).toBe(true);
  });

  it("does not catch the word infiltrator on a tied top vote", () => {
    const state = {
      phase: "result" as const,
      config: { topicCategory: "all" as const, discussionTimeSec: 180 as const },
      topic: { id: "fruit", category: "food" as const, categoryLabel: "食べ物", secretWord: "りんご", enabled: true },
      infiltratorPlayerId: "p1",
      currentPlayerIndex: 0,
      revealViewedPlayerIds: [],
      clueOrder: players.map((player) => player.id),
      votes: [
        { fromPlayerId: "p1", targetPlayerId: "p2" },
        { fromPlayerId: "p2", targetPlayerId: "p1" },
        { fromPlayerId: "p3", targetPlayerId: "p1" },
        { fromPlayerId: "p4", targetPlayerId: "p2" }
      ]
    } satisfies WordInfiltratorState;

    expect(judgeWordInfiltrator(state).caught).toBe(false);
  });

  it("keeps the Fake Artist question master out of drawing and treats tied top votes as not caught", () => {
    const state = createFakeArtistState(fivePlayers, { topicCategory: "all", strokesPerPlayer: 2 }, "fake-artist-qm-test");
    expect(state.fakeArtistPlayerId).not.toBe(state.questionMasterPlayerId);
    expect(state.drawOrder).not.toContain(state.questionMasterPlayerId);

    const artistVoters = fivePlayers.filter((player) => player.id !== state.questionMasterPlayerId);
    const otherTargetId = artistVoters.find((player) => player.id !== state.fakeArtistPlayerId)?.id ?? artistVoters[0].id;
    const tiedState = {
      ...state,
      votes: [
        { fromPlayerId: artistVoters[0].id, targetPlayerId: state.fakeArtistPlayerId },
        { fromPlayerId: artistVoters[1].id, targetPlayerId: state.fakeArtistPlayerId },
        { fromPlayerId: artistVoters[2].id, targetPlayerId: otherTargetId },
        { fromPlayerId: artistVoters[3].id, targetPlayerId: otherTargetId }
      ]
    } satisfies FakeArtistState;

    expect(judgeFakeArtist(tiedState).caught).toBe(false);
  });
});

describe("Quick party games", () => {
  it("scores everyone in a tied largest majority group", () => {
    let state = createMajorityMatchState(players, defaultMajorityMatchConfig(), "majority-test");
    state = submitMajorityMatchAnswer(state, { playerId: "p1", text: "カレー" });
    state = submitMajorityMatchAnswer(state, { playerId: "p2", text: "カレー！" });
    state = submitMajorityMatchAnswer(state, { playerId: "p3", text: "ラーメン" });
    state = submitMajorityMatchAnswer(state, { playerId: "p4", text: "ラーメン" });

    const result = scoreMajorityMatchRound(state.rounds[0]);
    expect(result.largestGroupSize).toBe(2);
    expect(Object.values(result.pointsByPlayerId)).toEqual([1, 1, 1, 1]);
  });

  it("cancels duplicate one-word clues and allows manual clue removal", () => {
    let state = createOneWordClueState(players, defaultOneWordClueConfig(), "one-word-test");
    const round = currentOneWordClueRound(state);
    state = submitOneWordClue(state, round.cluePlayerIds[0], "黄色");
    state = submitOneWordClue(state, round.cluePlayerIds[1], "黄色！");
    state = submitOneWordClue(state, round.cluePlayerIds[2], "甘い");

    expect(activeOneWordClues(state).map((clue) => clue.text)).toEqual(["甘い"]);
    state = toggleOneWordClueCancelled(state, round.cluePlayerIds[2]);
    expect(activeOneWordClues(state)).toHaveLength(0);

    const guessed = submitOneWordGuess(state, round.target.text);
    expect(currentOneWordClueRound(guessed).correct).toBe(true);
  });
});

describe("Ad and reload safety", () => {
  it("allows ads only on public non-secret surfaces", () => {
    const allowed = new Set<AdContext>(["home", "playerSetup", "gameSetup", "result"]);
    const contexts: AdContext[] = ["home", "playerSetup", "gameSetup", "result", "handoff", "secret", "answering", "voting"];

    contexts.forEach((context) => {
      expect(canShowAds(context)).toBe(allowed.has(context));
    });
  });

  it("moves unsafe phases to safe fallbacks without mutating the original state", () => {
    const state = { phase: "nightAction" as "nightAction" | "handoff" | "result", value: 1 };
    const sanitized = sanitizeReloadPhase(state, { nightAction: "handoff" });

    expect(sanitized?.phase).toBe("handoff");
    expect(state.phase).toBe("nightAction");
    expect(sanitizeReloadPhase({ phase: "secretVote" as "secretVote" | "handoff" }, {}, [{ prefix: "secret", fallback: "handoff" }])?.phase).toBe("handoff");
    expect(sanitizeReloadPhase(null, {})).toBeNull();
  });
});

function sequenceRandom(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0.5;
}

function createBill(id: string, label: string, totalYen: number, payerId: string, amounts: number[]): BillSplitBill {
  const participants: BillSplitParticipant[] = players.map((player) => ({ ...player, weight: 1 }));
  return {
    id,
    label,
    totalYen,
    payerId,
    participants,
    shares: participants.map((participant, index) => ({ ...participant, amountYen: amounts[index], receivedRemainder: false })),
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z"
  };
}
