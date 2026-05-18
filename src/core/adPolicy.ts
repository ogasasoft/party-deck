import { AdContext } from "./types";

export function canShowAds(context: AdContext) {
  return context === "home" || context === "playerSetup" || context === "gameSetup" || context === "result";
}
