import assert from "node:assert/strict";
import { distanceMeters } from "../src/core/distance";
import { games, getGameDefinition, isGameAvailable } from "../src/core/gameRegistry";
import { sanitizeReloadPhase } from "../src/core/reloadSafety";
import { formatClock } from "../src/core/time";
import { DEFAULT_PLAYERS } from "../src/core/types";
import { drinkingGameSourceRefs, drinkingGames } from "../src/data/drinkingGames";
import { fallbackGeoLocations } from "../src/data/geoLocations";
import { createGeoAnswer, createGeoState, currentGeoLocation, defaultGeoConfig, replaceCurrentGeoLocation } from "../src/games/geoGuessr";
import { createDrinkingGamesState, defaultDrinkingGamesConfig, filterDrinkingGames } from "../src/games/drinkingGames";
import { fakeArtistTopics } from "../src/data/fakeArtistTopics";
import { createFakeArtistState, currentDrawingPlayerId, defaultFakeArtistConfig, judgeFakeArtist, submitFakeArtistVote } from "../src/games/fakeArtist";
import { insiderAnswers } from "../src/data/insiderAnswers";
import { createInsiderGuessState, defaultInsiderGuessConfig, getInsiderRole, judgeInsiderGuess, submitInsiderGuessVote, type InsiderGuessState } from "../src/games/insiderGuess";
import { createMapillaryImageEndpoint } from "../src/games/mapillaryProvider";
import { numberTalkTopics } from "../src/data/numberTopics";
import { createNumberTalkState, defaultNumberTalkConfig, isNumberOrderCorrect } from "../src/games/numberTalk";
import { rankingAnswerPrompts } from "../src/data/rankingAnswerPrompts";
import { computeRankingMistakes, createRankingAnswersState, currentRankingRound, defaultRankingAnswersConfig, getRankingNumberForPlayer, totalRankingMistakes, updateCurrentRankingRound } from "../src/games/rankingAnswers";
import { spyLocations } from "../src/data/spyLocations";
import { createSpyLocationState, defaultSpyLocationConfig, hasSpyLocationAccusationConsensus, judgeSpyLocation, submitSpyLocationAccusationVote, type SpyLocationState } from "../src/games/spyLocation";
import { spectrumScales } from "../src/data/spectrumScales";
import {
  advanceSpectrumRound,
  createSpectrumMeterState,
  currentSpectrumRound,
  defaultSpectrumMeterConfig,
  otherSpectrumTeam,
  scoreSpectrumGuess,
  scoreSpectrumRound,
  totalSpectrumScore,
  updateCurrentSpectrumRound
} from "../src/games/spectrumMeter";
import { applyRobberAction, applySeerAction, buildRoleSet, countRoleCards, createWerewolfState, defaultWerewolfConfig, getNightAction, judgeWerewolf, resolveWerewolfNightActions, type WerewolfState, type WerewolfVote } from "../src/games/werewolf";
import { wordInfiltratorTopics } from "../src/data/wordInfiltratorTopics";
import { createWordInfiltratorState, defaultWordInfiltratorConfig, judgeWordInfiltrator, submitWordInfiltratorVote } from "../src/games/wordInfiltrator";
import { assignJapanRegion, isPointInJapan } from "./geo-quality";

const players = DEFAULT_PLAYERS.slice(0, 4);

function smokeGameRegistry() {
  assert.deepEqual(
    games.map((game) => game.id),
    ["drinking-games", "number-talk", "werewolf", "word-infiltrator", "insider-guess", "spy-location", "spectrum-meter", "ranking-answers", "fake-artist", "geo"]
  );
  assert.equal(games[0].id, "drinking-games");
  assert.equal(getGameDefinition("geo").availability, "paused");
  assert.equal(isGameAvailable("geo"), false);
  assert.equal(isGameAvailable("drinking-games"), true);
  assert.equal(getGameDefinition("geo").minPlayers, 2);
  assert.equal(getGameDefinition("number-talk").defaultConfig().numberMax, 100);
  assert.equal(countRoleCards(getGameDefinition("werewolf").defaultConfig().roleCounts), players.length + 2);
  assert.equal(getGameDefinition("drinking-games").defaultConfig().viewMode, "database");
  assert.equal(getGameDefinition("word-infiltrator").minPlayers, 3);
  assert.equal(getGameDefinition("insider-guess").minPlayers, 4);
  assert.equal(getGameDefinition("spy-location").minPlayers, 4);
  assert.equal(getGameDefinition("spectrum-meter").minPlayers, 4);
  assert.equal(getGameDefinition("ranking-answers").minPlayers, 4);
  assert.equal(getGameDefinition("fake-artist").minPlayers, 5);
  assert.equal(formatClock(180), "3:00");
  assert.equal(formatClock(5), "0:05");
}

function smokeReloadSafety() {
  type DemoPhase = "safe" | "secret" | "vote" | "nightAction" | "handoff";
  type DemoState = {
    phase: DemoPhase;
    nested: {
      visible: boolean;
    };
  };
  const fallbackMap = {
    secret: "handoff",
    vote: "handoff"
  } satisfies Partial<Record<DemoPhase, DemoPhase>>;

  const secretState: DemoState = { phase: "secret", nested: { visible: true } };
  const sanitizedSecret = sanitizeReloadPhase(secretState, fallbackMap, [{ prefix: "night", fallback: "handoff" }]);
  assert.equal(sanitizedSecret?.phase, "handoff");
  assert.equal(secretState.phase, "secret");
  sanitizedSecret!.nested.visible = false;
  assert.equal(secretState.nested.visible, true);

  const nightState: DemoState = { phase: "nightAction", nested: { visible: true } };
  assert.equal(sanitizeReloadPhase(nightState, fallbackMap, [{ prefix: "night", fallback: "handoff" }])?.phase, "handoff");

  const safeState: DemoState = { phase: "safe", nested: { visible: true } };
  assert.equal(sanitizeReloadPhase(safeState, fallbackMap, [{ prefix: "night", fallback: "handoff" }])?.phase, "safe");
}

function smokeNumberTalk() {
  const state = createNumberTalkState(players, defaultNumberTalkConfig(), "smoke-number");
  assert.equal(state.assignments.length, players.length);
  assert.equal(new Set(state.assignments.map((assignment) => assignment.number)).size, players.length);
  assert.ok(state.assignments.every((assignment) => assignment.number >= 1 && assignment.number <= 100));
  assert.equal(numberTalkTopics.filter((topic) => topic.category === "normal" && topic.enabled).length, 20);
  assert.equal(numberTalkTopics.filter((topic) => topic.category === "twist" && topic.enabled).length, 20);
  assert.equal(numberTalkTopics.filter((topic) => topic.category === "love" && topic.enabled).length, 20);
  assert.equal(new Set(numberTalkTopics.map((topic) => topic.id)).size, numberTalkTopics.length);
  assert.equal(new Set(numberTalkTopics.map((topic) => topic.text)).size, numberTalkTopics.length);

  const orderedState = {
    ...state,
    order: [...state.assignments].sort((a, b) => a.number - b.number).map((assignment) => assignment.playerId)
  };
  assert.equal(isNumberOrderCorrect(orderedState), true);
}

function smokeWerewolf() {
  const roles = buildRoleSet(players.length);
  assert.equal(roles.length, players.length + 2);
  assert.ok(roles.includes("werewolf"));
  assert.ok(roles.includes("seer"));
  assert.ok(roles.includes("robber"));

  const state = createWerewolfState(players, defaultWerewolfConfig(), "smoke-werewolf");
  assert.equal(Object.keys(state.playerInitialCards).length, players.length);
  assert.equal(state.centerCards.length, 2);

  const actionState: WerewolfState = {
    ...state,
    playerCurrentCards: {
      [players[0].id]: "seer",
      [players[1].id]: "werewolf",
      [players[2].id]: "robber",
      [players[3].id]: "villager"
    },
    centerCards: ["villager", "werewolf"] as ["villager", "werewolf"],
    nightActions: []
  };
  applySeerAction(actionState, players[0].id, { mode: "player", targetPlayerId: players[1].id });
  const seerAction = getNightAction(actionState, "seer");
  assert.equal(seerAction?.mode, "player");
  assert.equal(seerAction.mode === "player" ? seerAction.seenRole : undefined, "werewolf");
  applyRobberAction(actionState, players[2].id, players[1].id);
  assert.equal(actionState.playerCurrentCards[players[2].id], "robber");
  assert.equal(getNightAction(actionState, "robber")?.newRole, "werewolf");
  resolveWerewolfNightActions(actionState);
  assert.equal(actionState.playerCurrentCards[players[2].id], "werewolf");

  const forcedVotes: WerewolfVote[] = [
    { fromPlayerId: players[0].id, targetType: "player", targetPlayerId: players[1].id },
    { fromPlayerId: players[1].id, targetType: "player", targetPlayerId: players[0].id },
    { fromPlayerId: players[2].id, targetType: "player", targetPlayerId: players[0].id },
    { fromPlayerId: players[3].id, targetType: "player", targetPlayerId: players[0].id }
  ];
  const judged = judgeWerewolf(
    {
      ...state,
      playerCurrentCards: {
        [players[0].id]: "werewolf",
        [players[1].id]: "villager",
        [players[2].id]: "seer",
        [players[3].id]: "robber"
      },
      votes: forcedVotes
    },
    players
  );
  assert.equal(judged.winningTeam, "human");
  assert.deepEqual(judged.executedPlayerIds, [players[0].id]);
}

function smokeGeoGuessr() {
  const state = createGeoState(players, defaultGeoConfig(), "smoke-geo");
  assert.equal(state.roundLocations.length, 1);
  const location = currentGeoLocation(state);
  const answer = createGeoAnswer(state, players[0].id, { lat: location.lat, lng: location.lng });
  assert.equal(answer.distanceMeters, 0);
  assert.equal(answer.score, 5000);
  const replacedState = replaceCurrentGeoLocation(state, fallbackGeoLocations[1]);
  assert.equal(currentGeoLocation(replacedState).id, fallbackGeoLocations[1].id);
  assert.equal(replacedState.pendingGuess, undefined);

  const tokyoToKyoto = distanceMeters({ lat: 35.681236, lng: 139.767125 }, { lat: 35.011636, lng: 135.768029 });
  assert.ok(tokyoToKyoto > 300_000);

  const endpoint = createMapillaryImageEndpoint("image id", "token value");
  assert.ok(endpoint.startsWith("https://graph.mapillary.com/image%20id?"));
  assert.ok(endpoint.includes("access_token=token+value"));
  assert.ok(endpoint.includes("thumb_2048_url"));

  assert.equal(isPointInJapan(35.681236, 139.767125), true);
  assert.deepEqual(assignJapanRegion(35.681236, 139.767125), { region: "関東", prefecture: "東京都" });
  assert.deepEqual(assignJapanRegion(43.060646, 141.354376), { region: "北海道", prefecture: "北海道" });
  assert.deepEqual(assignJapanRegion(35.011636, 135.768029), { region: "関西", prefecture: "京都府" });
  assert.deepEqual(assignJapanRegion(33.590183, 130.420685), { region: "九州", prefecture: "福岡県" });
  assert.deepEqual(assignJapanRegion(26.214856, 127.681111), { region: "沖縄", prefecture: "沖縄県" });
  assert.equal(isPointInJapan(37.5665, 126.978), false);
  assert.equal(isPointInJapan(25.033, 121.565), false);
}

function smokeDrinkingGames() {
  assert.ok(drinkingGames.length >= 82);
  assert.equal(new Set(drinkingGames.map((game) => game.id)).size, drinkingGames.length);
  assert.ok(drinkingGames.every((game) => game.noEquipment));
  assert.ok(drinkingGames.every((game) => game.rules.length >= 3));
  assert.ok(drinkingGames.every((game) => game.duplicateKey.length > 0));
  assert.ok(drinkingGames.every((game) => game.sourceRefs.every((sourceRef) => sourceRef in drinkingGameSourceRefs)));
  assert.ok(drinkingGames.filter((game) => game.intensity === "strong").every((game) => (game.contentWarnings?.length ?? 0) > 0));

  const state = createDrinkingGamesState(defaultDrinkingGamesConfig());
  assert.equal(filterDrinkingGames({ ...state, query: "NG", country: "all" }).some((game) => game.id === "ng-word"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "挿入", country: "all" }).some((game) => game.id === "soft-goal-word-story"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "Son Byung Ho", country: "all" }).some((game) => game.id === "never-have-i-ever"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "007", country: "all" }).some((game) => game.id === "zero-zero-seven-bang"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "ほうれん草", country: "all" }).some((game) => game.id === "spinach-relay"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "炙りカルビ", country: "all" }).some((game) => game.id === "aburi-karubi"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "Babo Game", country: "all" }).some((game) => game.id === "spoken-shown-number"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "Questions Only", country: "all" }).some((game) => game.id === "questions-only"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "Smash or Pass", country: "all" }).some((game) => game.id === "yes-or-no-attraction"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "秘密", country: "all" }).some((game) => game.id === "listen-no-judge"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "日本" }).every((game) => game.country === "日本"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "apt-game"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "strawberry-rhythm"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "baskin-robbins-31"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "sam-yuk-gu"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "下ネタ" }).every((game) => game.specialCategory === "下ネタ"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "all", intensity: "strong" }).every((game) => game.intensity === "strong"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "all", intensity: "light" }).every((game) => !game.intensity || game.intensity === "light"), true);
}

function smokeWordInfiltrator() {
  assert.equal(wordInfiltratorTopics.length, 36);
  assert.equal(new Set(wordInfiltratorTopics.map((topic) => topic.id)).size, wordInfiltratorTopics.length);
  assert.equal(new Set(wordInfiltratorTopics.map((topic) => topic.secretWord)).size, wordInfiltratorTopics.length);

  const state = createWordInfiltratorState(players, defaultWordInfiltratorConfig(), "smoke-word");
  assert.equal(state.phase, "handoff");
  assert.ok(players.some((player) => player.id === state.infiltratorPlayerId));
  assert.equal(state.clueOrder.length, players.length);

  const voters = players.filter((player) => player.id !== state.infiltratorPlayerId);
  const votedState = voters.reduce(
    (nextState, voter) => submitWordInfiltratorVote(nextState, { fromPlayerId: voter.id, targetPlayerId: state.infiltratorPlayerId }),
    state
  );
  const caughtResult = judgeWordInfiltrator({ ...votedState, infiltratorGuess: "ぜんぜん違う" });
  assert.equal(caughtResult.caught, true);
  assert.equal(caughtResult.winningTeam, "majority");

  const guessedResult = judgeWordInfiltrator({ ...votedState, infiltratorGuess: state.topic.secretWord });
  assert.equal(guessedResult.guessCorrect, true);
  assert.equal(guessedResult.winningTeam, "infiltrator");

  const otherTarget = voters.find((player) => player.id !== state.infiltratorPlayerId)?.id ?? voters[0].id;
  const tiedResult = judgeWordInfiltrator({
    ...state,
    votes: [
      { fromPlayerId: players[0].id, targetPlayerId: state.infiltratorPlayerId },
      { fromPlayerId: players[1].id, targetPlayerId: state.infiltratorPlayerId },
      { fromPlayerId: players[2].id, targetPlayerId: otherTarget },
      { fromPlayerId: players[3].id, targetPlayerId: otherTarget }
    ]
  });
  assert.equal(tiedResult.caught, false);
}

function smokeInsiderGuess() {
  assert.equal(insiderAnswers.length, 30);
  assert.equal(new Set(insiderAnswers.map((answer) => answer.id)).size, insiderAnswers.length);
  assert.equal(new Set(insiderAnswers.map((answer) => answer.text)).size, insiderAnswers.length);

  const state = createInsiderGuessState(players, defaultInsiderGuessConfig(), "smoke-insider");
  assert.equal(state.phase, "roleHandoff");
  assert.ok(players.some((player) => player.id === state.masterPlayerId));
  assert.ok(players.some((player) => player.id === state.insiderPlayerId));
  assert.notEqual(state.masterPlayerId, state.insiderPlayerId);
  assert.equal(getInsiderRole(state, state.masterPlayerId), "master");
  assert.equal(getInsiderRole(state, state.insiderPlayerId), "insider");

  const initialVoteState: InsiderGuessState = { ...state, guessedCorrectly: true };
  const votedState = players.reduce(
    (nextState, voter) => submitInsiderGuessVote(nextState, { fromPlayerId: voter.id, targetPlayerId: state.insiderPlayerId }),
    initialVoteState
  );
  const citizenWin = judgeInsiderGuess(votedState);
  assert.equal(citizenWin.winningTeam, "citizens");

  const failed = judgeInsiderGuess({ ...state, guessedCorrectly: false });
  assert.equal(failed.winningTeam, "failed");
}

function smokeSpyLocation() {
  assert.equal(spyLocations.length, 30);
  assert.equal(new Set(spyLocations.map((location) => location.id)).size, spyLocations.length);
  assert.equal(new Set(spyLocations.map((location) => location.name)).size, spyLocations.length);

  const state = createSpyLocationState(players, defaultSpyLocationConfig(), "smoke-spy");
  assert.equal(state.phase, "handoff");
  assert.ok(players.some((player) => player.id === state.spyPlayerId));

  const initialAccusationState: SpyLocationState = { ...state, accusedPlayerId: state.spyPlayerId };
  const accusationState = players
    .filter((player) => player.id !== state.spyPlayerId)
    .reduce(
    (nextState, voter) => submitSpyLocationAccusationVote(nextState, { fromPlayerId: voter.id, agrees: true }),
    initialAccusationState
  );
  assert.equal(hasSpyLocationAccusationConsensus(accusationState, players.length), true);
  const localWin = judgeSpyLocation(accusationState, players.length);
  assert.equal(localWin.winningTeam, "locals");

  const spyWin = judgeSpyLocation({ ...state, spyGuessLocationId: state.location.id }, players.length);
  assert.equal(spyWin.winningTeam, "spy");
}

function smokeSpectrumMeter() {
  assert.equal(spectrumScales.length, 25);
  assert.equal(new Set(spectrumScales.map((scale) => scale.id)).size, spectrumScales.length);
  assert.equal(scoreSpectrumGuess(50, 50), 4);
  assert.equal(scoreSpectrumGuess(50, 68), 0);
  assert.equal(scoreSpectrumGuess(50, 80), 0);

  const state = createSpectrumMeterState(players, defaultSpectrumMeterConfig(), "smoke-spectrum");
  assert.equal(state.phase, "teamReveal");
  assert.equal(state.rounds.length, 1);
  assert.equal(state.teamPlayerIds.a.length, 2);
  assert.equal(state.teamPlayerIds.b.length, 2);
  assert.deepEqual(state.teamScores, { a: 0, b: 1 });
  const round = currentSpectrumRound(state);
  assert.ok(round.targetValue >= 0 && round.targetValue <= 100);
  const guessed = updateCurrentSpectrumRound(state, { guessValue: round.targetValue });
  const scored = scoreSpectrumRound(guessed, "left");
  assert.equal(scored.teamScores[round.activeTeamId], 4);
  assert.equal(scored.teamScores[otherSpectrumTeam(round.activeTeamId)], 1);
  assert.equal(totalSpectrumScore(scored), 5);
  const catchUp = advanceSpectrumRound(scoreSpectrumRound({ ...guessed, teamScores: { a: 0, b: 9 } }, "left"));
  assert.equal(currentSpectrumRound(catchUp).activeTeamId, round.activeTeamId);
}

function smokeRankingAnswers() {
  assert.equal(rankingAnswerPrompts.length, 25);
  assert.equal(new Set(rankingAnswerPrompts.map((prompt) => prompt.id)).size, rankingAnswerPrompts.length);

  const state = createRankingAnswersState(players, defaultRankingAnswersConfig(), "smoke-ranking");
  assert.equal(state.phase, "numberHandoff");
  assert.equal(state.rounds.length, 5);
  assert.equal(state.config.mistakeLimit, players.length);
  const round = currentRankingRound(state);
  assert.equal(round.assignments.length, players.length);
  assert.ok(players.every((player) => getRankingNumberForPlayer(state, player.id) >= 1));
  const correctOrder = [...round.assignments].sort((a, b) => a.number - b.number).map((assignment) => assignment.playerId);
  const scored = updateCurrentRankingRound(state, {
    captainOrder: correctOrder,
    mistakeCount: computeRankingMistakes({ ...round, captainOrder: correctOrder })
  });
  assert.equal(currentRankingRound(scored).mistakeCount, 0);
  assert.equal(totalRankingMistakes(scored), 0);
}

function smokeFakeArtist() {
  const fakePlayers = DEFAULT_PLAYERS.concat({ id: "p5", nickname: "ソラ", color: "#e76f51" });
  assert.equal(fakeArtistTopics.length, 30);
  assert.equal(new Set(fakeArtistTopics.map((topic) => topic.id)).size, fakeArtistTopics.length);
  assert.equal(new Set(fakeArtistTopics.map((topic) => topic.text)).size, fakeArtistTopics.length);

  const state = createFakeArtistState(fakePlayers, defaultFakeArtistConfig(), "smoke-fake");
  assert.equal(state.phase, "handoff");
  assert.notEqual(state.questionMasterPlayerId, state.fakeArtistPlayerId);
  assert.equal(state.drawOrder.length, (fakePlayers.length - 1) * 2);
  assert.equal(state.drawOrder.includes(state.questionMasterPlayerId), false);
  assert.ok(fakePlayers.some((player) => player.id === state.fakeArtistPlayerId));
  assert.ok(currentDrawingPlayerId(state));

  const votedState = fakePlayers
    .filter((player) => player.id !== state.fakeArtistPlayerId && player.id !== state.questionMasterPlayerId)
    .reduce((nextState, voter) => submitFakeArtistVote(nextState, { fromPlayerId: voter.id, targetPlayerId: state.fakeArtistPlayerId }), state);
  const result = judgeFakeArtist({ ...votedState, fakeGuess: "違う" });
  assert.equal(result.caught, true);
  assert.equal(result.winningTeam, "artists");

  const artistVoters = fakePlayers.filter((player) => player.id !== state.questionMasterPlayerId);
  const otherTargetId = artistVoters.find((player) => player.id !== state.fakeArtistPlayerId)?.id ?? artistVoters[0].id;
  const tiedResult = judgeFakeArtist({
    ...state,
    votes: [
      { fromPlayerId: artistVoters[0].id, targetPlayerId: state.fakeArtistPlayerId },
      { fromPlayerId: artistVoters[1].id, targetPlayerId: state.fakeArtistPlayerId },
      { fromPlayerId: artistVoters[2].id, targetPlayerId: otherTargetId },
      { fromPlayerId: artistVoters[3].id, targetPlayerId: otherTargetId }
    ]
  });
  assert.equal(tiedResult.caught, false);
}

smokeGameRegistry();
smokeReloadSafety();
smokeNumberTalk();
smokeWerewolf();
smokeGeoGuessr();
smokeDrinkingGames();
smokeWordInfiltrator();
smokeInsiderGuess();
smokeSpyLocation();
smokeSpectrumMeter();
smokeRankingAnswers();
smokeFakeArtist();

console.log("smoke ok");
