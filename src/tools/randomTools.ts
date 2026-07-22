export type CoinSide = "heads" | "tails";

export const MAX_WHEEL_ITEMS = 20;
export const MAX_WHEEL_ITEM_GRAPHEMES = 40;
export const MAX_WHEEL_ITEM_CODE_UNITS = 256;
export const MAX_WHEEL_INPUT_CODE_UNITS = MAX_WHEEL_ITEMS * (MAX_WHEEL_ITEM_CODE_UNITS + 1);

type SegmenterLike = {
  segment: (value: string) => Iterable<{ segment: string }>;
};

type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: "grapheme" }
) => SegmenterLike;

const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter;
const graphemeSegmenter = Segmenter ? new Segmenter("ja", { granularity: "grapheme" }) : null;

export function normalizeWheelItems(input: string) {
  return input
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => sliceGraphemes(item, MAX_WHEEL_ITEM_GRAPHEMES, MAX_WHEEL_ITEM_CODE_UNITS))
    .filter(Boolean)
    .slice(0, MAX_WHEEL_ITEMS);
}

export function formatWheelLabel(label: string, maxGraphemes = 8) {
  if (!Number.isSafeInteger(maxGraphemes) || maxGraphemes < 1) throw new Error("表示文字数が無効です。");
  const graphemes = splitGraphemes(label);
  return graphemes.length > maxGraphemes ? `${graphemes.slice(0, maxGraphemes).join("")}…` : label;
}

export function pickWheelIndex(itemCount: number, random?: () => number) {
  if (!Number.isSafeInteger(itemCount) || itemCount < 2 || itemCount > MAX_WHEEL_ITEMS) {
    throw new Error(`候補は2件から${MAX_WHEEL_ITEMS}件にしてください。`);
  }
  return randomInt(itemCount, random);
}

export function flipCoin(random?: () => number): CoinSide {
  return randomInt(2, random) === 0 ? "heads" : "tails";
}

export function rollDice(count: number, random?: () => number) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 3) throw new Error("サイコロは1個から3個にしてください。");
  return Array.from({ length: count }, () => randomInt(6, random) + 1);
}

export function randomInt(maxExclusive: number, random?: () => number) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x100000000) throw new Error("乱数範囲が無効です。");
  if (random) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error("乱数値が無効です。");
    return Math.floor(value * maxExclusive);
  }
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    return Math.floor(Math.random() * maxExclusive);
  }
  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

function sliceGraphemes(value: string, maxGraphemes: number, maxCodeUnits = Number.POSITIVE_INFINITY) {
  const result: string[] = [];
  let codeUnits = 0;
  for (const grapheme of splitGraphemes(value)) {
    if (result.length >= maxGraphemes || codeUnits + grapheme.length > maxCodeUnits) break;
    result.push(grapheme);
    codeUnits += grapheme.length;
  }
  return result.join("");
}

function splitGraphemes(value: string) {
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(value), (part) => part.segment)
    : Array.from(value);
}
