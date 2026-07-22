import { normalizeWheelItems } from "./randomTools";

const WHEEL_ITEMS_KEY = "party:v1:random-wheel-items";

export function loadWheelItemsText() {
  try {
    return localStorage.getItem(WHEEL_ITEMS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveWheelItemsText(value: string) {
  try {
    localStorage.setItem(WHEEL_ITEMS_KEY, normalizeWheelItems(value).join("\n"));
  } catch {
    // The random tools remain usable when storage is unavailable.
  }
}
