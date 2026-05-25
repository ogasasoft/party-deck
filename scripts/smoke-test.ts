import assert from "node:assert/strict";
import { distanceMeters } from "../src/core/distance";
import { games, getGameDefinition } from "../src/core/gameRegistry";
import { formatClock } from "../src/core/time";
import { DEFAULT_PLAYERS } from "../src/core/types";
import { drinkingGameSourceRefs, drinkingGames } from "../src/data/drinkingGames";
import { createGeoAnswer, createGeoState, currentGeoLocation, defaultGeoConfig } from "../src/games/geoGuessr";
import { createDrinkingGamesState, defaultDrinkingGamesConfig, filterDrinkingGames } from "../src/games/drinkingGames";
import { createMapillaryImageEndpoint } from "../src/games/mapillaryProvider";
import { numberTalkTopics } from "../src/data/numberTopics";
import { createNumberTalkState, defaultNumberTalkConfig, isNumberOrderCorrect } from "../src/games/numberTalk";
import { applyRobberAction, applySeerAction, buildRoleSet, countRoleCards, createWerewolfState, defaultWerewolfConfig, getNightAction, judgeWerewolf, type WerewolfState, type WerewolfVote } from "../src/games/werewolf";
import { assignJapanRegion, isPointInJapan } from "./geo-quality";

const players = DEFAULT_PLAYERS.slice(0, 4);

function smokeGameRegistry() {
  assert.deepEqual(
    games.map((game) => game.id),
    ["geo", "number-talk", "werewolf", "drinking-games"]
  );
  assert.equal(getGameDefinition("geo").minPlayers, 2);
  assert.equal(getGameDefinition("number-talk").defaultConfig().numberMax, 100);
  assert.equal(countRoleCards(getGameDefinition("werewolf").defaultConfig().roleCounts), players.length + 2);
  assert.equal(getGameDefinition("drinking-games").defaultConfig().viewMode, "database");
  assert.equal(formatClock(180), "3:00");
  assert.equal(formatClock(5), "0:05");
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
  assert.equal(actionState.playerCurrentCards[players[2].id], "werewolf");
  assert.equal(getNightAction(actionState, "robber")?.newRole, "werewolf");

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
  assert.ok(drinkingGames.length >= 60);
  assert.equal(new Set(drinkingGames.map((game) => game.id)).size, drinkingGames.length);
  assert.ok(drinkingGames.every((game) => game.noEquipment));
  assert.ok(drinkingGames.every((game) => game.rules.length >= 3));
  assert.ok(drinkingGames.every((game) => game.duplicateKey.length > 0));
  assert.ok(drinkingGames.every((game) => game.sourceRefs.every((sourceRef) => sourceRef in drinkingGameSourceRefs)));

  const state = createDrinkingGamesState(defaultDrinkingGamesConfig());
  assert.equal(filterDrinkingGames({ ...state, query: "NG", country: "all" }).some((game) => game.id === "ng-word"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "挿入", country: "all" }).some((game) => game.id === "soft-goal-word-story"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "Son Byung Ho", country: "all" }).some((game) => game.id === "never-have-i-ever"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "007", country: "all" }).some((game) => game.id === "zero-zero-seven-bang"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "ほうれん草", country: "all" }).some((game) => game.id === "spinach-relay"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "日本" }).every((game) => game.country === "日本"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "apt-game"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "baskin-robbins-31"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "韓国" }).some((game) => game.id === "sam-yuk-gu"), true);
  assert.equal(filterDrinkingGames({ ...state, query: "", country: "下ネタ" }).every((game) => game.specialCategory === "下ネタ"), true);
}

smokeGameRegistry();
smokeNumberTalk();
smokeWerewolf();
smokeGeoGuessr();
smokeDrinkingGames();

console.log("smoke ok");
