import { drinkingGames, type DrinkingGameIntensity } from "../data/drinkingGames";

export type DrinkingGamesConfig = {
  viewMode: "database";
};

export type DrinkingGamesState = {
  phase: "browse";
  config: DrinkingGamesConfig;
  query: string;
  country: "all" | string;
  intensity: "all" | DrinkingGameIntensity;
  selectedGameId?: string;
};

export function defaultDrinkingGamesConfig(): DrinkingGamesConfig {
  return {
    viewMode: "database"
  };
}

export function createDrinkingGamesState(config: DrinkingGamesConfig): DrinkingGamesState {
  return {
    phase: "browse",
    config,
    query: "",
    country: "all",
    intensity: "all"
  };
}

export function drinkingGameCountries() {
  return [...new Set(drinkingGames.map((game) => game.country).filter((country): country is NonNullable<typeof country> => Boolean(country)))];
}

export function drinkingGameSpecialCategories() {
  return [...new Set(drinkingGames.map((game) => game.specialCategory).filter((category): category is NonNullable<typeof category> => Boolean(category)))];
}

export function filterDrinkingGames(state: DrinkingGamesState) {
  const normalizedQuery = normalizeSearchText(state.query);
  return drinkingGames.filter((game) => {
    const filterMatched = state.country === "all" || game.country === state.country || game.specialCategory === state.country;
    if (!filterMatched) return false;
    const gameIntensity = game.intensity ?? "light";
    if (state.intensity !== "all" && gameIntensity !== state.intensity) return false;
    if (!normalizedQuery) return true;
    const haystack = normalizeSearchText([
      game.title,
      game.country,
      game.specialCategory,
      game.summary,
      game.aliases.join(" "),
      game.hiddenAliases?.join(" ") ?? "",
      game.intensity,
      game.contentWarnings?.join(" ") ?? "",
      game.mechanics.join(" "),
      game.rules.join(" ")
    ].join(" "));
    return haystack.includes(normalizedQuery);
  });
}

export function findDrinkingGame(id: string | undefined) {
  return drinkingGames.find((game) => game.id === id);
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().normalize("NFKC");
}
