import { drinkingGames } from "../data/drinkingGames";

export type DrinkingGamesConfig = {
  viewMode: "database";
};

export type DrinkingGamesState = {
  phase: "browse";
  config: DrinkingGamesConfig;
  query: string;
  country: "all" | string;
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
    country: "all"
  };
}

export function drinkingGameCountries() {
  return [...new Set(drinkingGames.map((game) => game.country).filter((country): country is NonNullable<typeof country> => Boolean(country)))];
}

export function filterDrinkingGames(state: DrinkingGamesState) {
  const normalizedQuery = normalizeSearchText(state.query);
  return drinkingGames.filter((game) => {
    const countryMatched = state.country === "all" || game.country === state.country;
    if (!countryMatched) return false;
    if (!normalizedQuery) return true;
    const haystack = normalizeSearchText([
      game.title,
      game.country,
      game.summary,
      game.aliases.join(" "),
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
