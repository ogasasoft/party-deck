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

const players = DEFAULT_PLAYERS.slice(0, 4);
const fivePlayers: Player[] = [...players, { id: "p5", nickname: "ソラ", color: "#e76f51" }];

beforeEach(() => {
  localStorage.clear();
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
    expect(games).toHaveLength(10);
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
