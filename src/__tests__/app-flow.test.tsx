import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root?.unmount();
    });
  }
  root = null;
  container?.remove();
  container = null;
});

describe("App pass-and-play flows", () => {
  it("returns legacy Geo sessions to the home screen", async () => {
    localStorage.setItem(
      "party:v1:app-state",
      JSON.stringify({
        screen: "game",
        selectedGame: "geo",
        players: [],
        activeSession: { sessionId: "geo:legacy", gameId: "geo" }
      })
    );

    await renderApp();

    expect(screenText()).toContain("ゲームを選ぶ");
    expect(screenText()).not.toContain("日本マップ当て");
  });

  it("opens player setup and adds a guest without collecting extra profile data", async () => {
    await renderApp();

    await clickButton("プレイヤー");
    expect(screenText()).toContain("プレイヤー");

    await clickButton("追加");
    expect(inputValues()).toContain("ゲスト5");
    expect(inputValues()).toEqual(["アオイ", "ミナト", "ユイ", "レン", "ゲスト5"]);
  });

  it("searches the drinking games database from the game list", async () => {
    await renderApp();

    await clickButton("飲み会ゲーム辞典");
    await clickButton("一覧を見る");
    expect(screenText()).toContain("飲み会ゲーム辞典");

    await fillInput("ゲーム名、別名、ルールで検索", "古今東西");
    expect(screenText()).toContain("古今東西");
    expect(screenText()).toContain("1件");
    expect(screenText()).toContain("ルールを見る");
  });

  it("shows a valid Werewolf role set in setup", async () => {
    await renderApp();

    await clickButton("ワンナイト人狼");
    expect(screenText()).toContain("役職カード");
    expect(screenText()).toContain("6/6枚");
    expect(screenText()).not.toContain("0/6枚");
    expect(buttonByText("はじめる")?.disabled).toBe(false);
  });

  it("previews and rerolls the Number Talk topic before starting", async () => {
    await renderApp();

    await clickButton("ナンバートーク");
    expect(screenText()).toContain("今回のお題");
    const previousTopic = setupTopicText();
    expect(previousTopic).toBeTruthy();

    await clickButton("お題を変える");
    expect(screenText()).toContain("今回のお題");
    expect(setupTopicText()).not.toBe(previousTopic);
  });

  it("reloads a Number Talk secret reveal back to the handoff screen", async () => {
    await renderApp();

    await clickButton("ナンバートーク");
    await clickButton("はじめる");
    await clickButton("画面を見る");
    expect(screenText()).toContain("隠して渡す");

    await remountApp();

    expect(screenText()).toContain("数字確認");
    expect(screenText()).toContain("画面を見る");
    expect(screenText()).not.toContain("隠して渡す");
  });

  it("starts Majority Match from its setup screen", async () => {
    await renderApp();

    await clickButton("みんなと同じ回答");
    expect(screenText()).toContain("最多グループ");
    await clickButton("はじめる");
    await waitForText("第1問 回答");
    expect(screenText()).toContain("第1問 回答");
    expect(screenText()).toContain("画面を見る");
  });

  it("reloads a One Word clue entry back to the handoff screen", async () => {
    await renderApp();

    await clickButton("ワンワード協力クイズ");
    await clickButton("はじめる");
    await waitForText("第1問 ヒント");
    await clickButton("画面を見る");
    expect(document.querySelector('input[placeholder="一語ヒント"]')).toBeTruthy();

    await remountApp();

    expect(screenText()).toContain("第1問 ヒント");
    expect(screenText()).toContain("画面を見る");
    expect(document.querySelector('input[placeholder="一語ヒント"]')).toBeNull();
  });

  it("calculates and restores a shop bill from the utility section", async () => {
    await renderApp();

    await clickButton("今日の割り勘");
    await waitForText("まず1軒目の会計を追加してください");
    expect(screenText()).toContain("まず1軒目の会計を追加してください");
    await clickButton("会計を追加");
    await fillInput("0", "12540");
    await clickButton("このお店を計算");

    expect(screenText()).toContain("12,540円");
    expect(screenText().match(/3,135円/g)).toHaveLength(4);
    expect(localStorage.getItem("party:v1:bill-split-day")).toContain("12540");

    await remountApp();
    expect(screenText()).toContain("1軒目");
    expect(screenText()).toContain("12,540円");
  });

  it("uses shop-specific weights across two bills and copies the final day result", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await renderApp();
    await openBillEditor();

    await fillInput("未入力なら1軒目", "居酒屋");
    await fillInput("0", "10000");
    await clickParticipantWeight("ユイ", "少なめ");
    await selectParticipantReason("ユイ", "non-drinker");
    await selectPayer("p1");
    await clickButton("このお店を計算");
    expect(screenText()).toContain("1,429円");
    expect(screenText()).toContain("飲んでいない");

    await clickBackButton();
    await clickButton("会計を追加");
    await fillInput("0", "9000");
    await selectPayer("p2");
    await clickButton("このお店を計算");
    await clickBackButton();
    await clickButton("一日の合計を見る");

    expect(screenText()).toContain("19,000円");
    expect(screenText()).toContain("負担額合計");
    expect(screenText()).toContain("最終精算");
    expect(screenText()).toContain("ユイ → ミナト");
    await clickButton("一日の合計をコピー");
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String(writeText.mock.calls[0][0])).toContain("居酒屋：10,000円");
    expect(String(writeText.mock.calls[0][0])).toContain("2軒目：9,000円");
  });

  it("clears the payer when that participant is excluded and shows the clipboard fallback", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    await renderApp();
    await openBillEditor();

    await fillInput("0", "10000");
    await selectPayer("p1");
    await setParticipantIncluded("アオイ", false);
    expect((document.querySelector(".bill-field select") as HTMLSelectElement | null)?.value).toBe("");
    await clickButton("このお店を計算");

    expect(screenText()).not.toContain("立替 アオイ");
    expect(document.querySelectorAll(".bill-share-row")).toHaveLength(3);
    await clickButton("このお店の結果をコピー");
    expect(document.querySelector('textarea[aria-label="コピー用テキスト"]')).toBeTruthy();
  });

  it("ends the current day and removes its saved bills", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    await renderApp();
    await openBillEditor();
    await fillInput("0", "4000");
    await clickButton("このお店を計算");
    await clickBackButton();
    expect(localStorage.getItem("party:v1:bill-split-day")).toContain("4000");

    await clickButton("今日の割り勘を終了");
    expect(screenText()).toContain("ゲームを選ぶ");
    expect(localStorage.getItem("party:v1:bill-split-day")).toBeNull();
  });

  it("edits and deletes one shop without changing another shop result", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    await renderApp();
    await openBillEditor();
    await fillInput("0", "10000");
    await clickButton("このお店を計算");
    await clickBackButton();
    const firstBefore = savedBillSplitDay().bills[0].shares;

    await clickButton("会計を追加");
    await fillInput("0", "4000");
    await clickButton("このお店を計算");
    await clickBackButton();
    await clickBillCardButton("2軒目", "編集");
    await fillInput("0", "8000");
    await clickButton("このお店を計算");
    await clickBackButton();

    expect(savedBillSplitDay().bills[0].shares).toEqual(firstBefore);
    expect(savedBillSplitDay().bills[1].totalYen).toBe(8000);
    await clickBillCardButton("2軒目", "削除");
    expect(savedBillSplitDay().bills).toHaveLength(1);
    expect(screenText()).toContain("10,000円");
    expect(screenText()).not.toContain("8,000円");
  });

  it("uses roulette, coin, and three dice from the random utility", async () => {
    stubReducedMotion();
    await renderApp();

    await clickButton("ランダムツール");
    await waitForText("候補を2件以上入力");
    const wheelStatus = document.querySelector<HTMLElement>(".random-result-status[role='status']");
    const wheelTextarea = document.querySelector<HTMLTextAreaElement>(".random-items-field textarea");
    expect(wheelStatus).toBeTruthy();
    expect(wheelStatus?.textContent).toBe("");
    expect(Number(wheelTextarea?.getAttribute("maxlength"))).toBeGreaterThan(0);
    expect(buttonByText("ルーレット")?.getAttribute("aria-pressed")).toBe("true");
    expect(buttonByText("コイン")?.getAttribute("aria-pressed")).toBe("false");
    await clickButton("登録プレイヤーを使う");
    expect((document.querySelector(".random-items-field textarea") as HTMLTextAreaElement).value).toContain("アオイ");
    await clickButton("ルーレットを回す");
    await waitForText("選ばれたのは", 300);
    expect(wheelStatus?.textContent).toMatch(/^選ばれたのは (アオイ|ミナト|ユイ|レン)$/);
    expect(wheelStatus?.textContent).not.toContain("もう一度");
    expect(["アオイ", "ミナト", "ユイ", "レン"].some((name) => screenText().includes(`選ばれたのは${name}`))).toBe(true);
    expect(localStorage.getItem("party:v1:random-wheel-items")).toContain("アオイ");

    await clickButton("コイン");
    expect(buttonByText("コイン")?.getAttribute("aria-pressed")).toBe("true");
    await clickButton("コインを投げる");
    await waitForText("結果", 300);
    expect(screenText()).toMatch(/結果[表裏]/);

    await clickButton("サイコロ");
    await clickButton("3個");
    expect(buttonByText("1個")?.getAttribute("aria-pressed")).toBe("false");
    expect(buttonByText("3個")?.getAttribute("aria-pressed")).toBe("true");
    await clickButton("サイコロを振る");
    await waitForText("合計", 300);
    expect(document.querySelectorAll(".random-dice-row span")).toHaveLength(3);
    const total = Number(document.querySelector(".random-result-label strong")?.textContent);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(total).toBeLessThanOrEqual(18);
  });

  it("handles wheel boundaries, locks controls, and removes and restores a result", async () => {
    stubReducedMotion();
    await renderApp();
    await clickButton("ランダムツール");
    await waitForText("候補を2件以上入力");

    await fillTextarea("赤");
    expect(buttonByText("ルーレットを回す")?.disabled).toBe(true);
    await fillTextarea("  赤  \n\n青");
    expect(screenText()).toContain("2/20件");
    expect(buttonByText("ルーレットを回す")?.disabled).toBe(false);

    const family = "👨‍👩‍👧‍👦";
    await fillTextarea(`${family.repeat(9)}\n通常`);
    expect(document.querySelector(".random-wheel text")?.textContent).toBe(`${family.repeat(8)}…`);

    const tooMany = Array.from({ length: 21 }, (_item, index) => `候補${index + 1}`).join("\n");
    await fillTextarea(tooMany);
    expect(screenText()).toContain("20/20件");
    expect(document.querySelectorAll(".random-wheel path")).toHaveLength(20);

    await fillTextarea("赤\n青\n緑");
    await clickButton("ルーレットを回す");
    expect(buttonByText("回転中…")?.disabled).toBe(true);
    expect((document.querySelector(".random-items-field textarea") as HTMLTextAreaElement).disabled).toBe(true);
    expect(buttonByText("登録プレイヤーを使う")?.disabled).toBe(true);
    await waitForText("選ばれたのは", 300);

    await clickButton("もう一度");
    expect(buttonByText("回転中…")?.disabled).toBe(true);
    await waitForText("選ばれたのは", 300);

    await clickButton("候補から外す");
    expect(screenText()).toContain("2/20件");
    expect(buttonByText("外した候補を戻す")?.disabled).toBe(false);
    await clickButton("ルーレットを回す");
    await waitForText("選ばれたのは", 300);
    expect(buttonByText("候補から外す")?.disabled).toBe(true);
    await clickButton("外した候補を戻す");
    expect(screenText()).toContain("3/20件");
  });

  it("restores only wheel candidates after reload and clears transient results", async () => {
    stubReducedMotion();
    await renderApp();
    await clickButton("ランダムツール");
    await waitForText("候補を2件以上入力");
    await fillTextarea("赤\n青\n緑");
    await clickButton("ルーレットを回す");
    await waitForText("選ばれたのは", 300);
    await clickButton("候補から外す");
    expect(buttonByText("外した候補を戻す")?.disabled).toBe(false);

    await remountApp();
    await waitForText("ルーレットを回す");
    expect((document.querySelector(".random-items-field textarea") as HTMLTextAreaElement).value.split("\n")).toHaveLength(2);
    expect(screenText()).not.toContain("選ばれたのは");
    expect(buttonByText("外した候補を戻す")?.disabled).toBe(true);
  });

  it("locks coin and dice controls while their results are being decided", async () => {
    stubReducedMotion();
    await renderApp();
    await clickButton("ランダムツール");
    await waitForText("候補を2件以上入力");

    await clickButton("コイン");
    await clickButton("コインを投げる");
    expect(buttonByText("回転中…")?.disabled).toBe(true);
    await waitForText("結果", 300);
    expect(buttonByText("コインを投げる")?.disabled).toBe(false);

    await clickButton("サイコロ");
    await clickButton("3個");
    await clickButton("サイコロを振る");
    expect(buttonByText("回転中…")?.disabled).toBe(true);
    expect(buttonByText("1個")?.disabled).toBe(true);
    expect(buttonByText("2個")?.disabled).toBe(true);
    expect(buttonByText("3個")?.disabled).toBe(true);
    await waitForText("合計", 300);
    expect(buttonByText("サイコロを振る")?.disabled).toBe(false);
  });

  it("keeps the random utility usable when all storage writes are denied", async () => {
    stubReducedMotion();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    await renderApp();

    await clickButton("ランダムツール");
    await waitForText("候補を2件以上入力");
    await clickButton("登録プレイヤーを使う");
    await clickButton("ルーレットを回す");
    await waitForText("選ばれたのは", 300);

    expect(screenText()).toContain("選ばれたのは");
    expect(setItem).toHaveBeenCalled();
    setItem.mockRestore();
  });
});

async function renderApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container as HTMLDivElement);
    root.render(<App />);
  });
}

async function remountApp() {
  if (!container) throw new Error("App is not mounted");
  await act(async () => {
    root?.unmount();
  });
  container.textContent = "";
  await act(async () => {
    root = createRoot(container as HTMLDivElement);
    root.render(<App />);
  });
}

async function clickButton(text: string) {
  const matches = buttons().filter((button) => button.textContent?.includes(text));
  expect(matches, `button containing ${text}`).toHaveLength(1);
  await act(async () => {
    matches[0].click();
  });
}

async function clickBackButton() {
  const button = document.querySelector<HTMLButtonElement>('button[aria-label="戻る"]');
  expect(button, "back button").toBeTruthy();
  await act(async () => {
    button?.click();
  });
}

async function openBillEditor() {
  await clickButton("今日の割り勘");
  await waitForText("まず1軒目の会計を追加してください");
  await clickButton("会計を追加");
}

async function clickParticipantWeight(playerName: string, weightLabel: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".bill-participant"));
  const card = cards.find((item) => item.textContent?.includes(playerName));
  const matches = Array.from(card?.querySelectorAll<HTMLButtonElement>("button") ?? []).filter((button) => button.textContent?.includes(weightLabel));
  expect(matches, `${playerName} ${weightLabel}`).toHaveLength(1);
  await act(async () => {
    matches[0].click();
  });
}

async function selectParticipantReason(playerName: string, value: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".bill-participant"));
  const select = cards.find((item) => item.textContent?.includes(playerName))?.querySelector("select");
  expect(select, `${playerName} reason`).toBeTruthy();
  await changeSelect(select as HTMLSelectElement, value);
}

async function selectPayer(value: string) {
  const select = document.querySelector<HTMLSelectElement>(".bill-field select");
  expect(select, "payer select").toBeTruthy();
  await changeSelect(select as HTMLSelectElement, value);
}

async function setParticipantIncluded(playerName: string, checked: boolean) {
  const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('.bill-participant input[type="checkbox"]'));
  const checkbox = checkboxes.find((item) => item.parentElement?.textContent?.includes(playerName));
  expect(checkbox, `${playerName} checkbox`).toBeTruthy();
  await act(async () => {
    if (checkbox?.checked !== checked) checkbox?.click();
  });
}

async function clickBillCardButton(label: string, buttonText: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".bill-card"));
  const card = cards.find((item) => item.textContent?.includes(label));
  const matches = Array.from(card?.querySelectorAll<HTMLButtonElement>("button") ?? []).filter((button) => button.textContent?.includes(buttonText));
  expect(matches, `${label} ${buttonText}`).toHaveLength(1);
  await act(async () => {
    matches[0].click();
  });
}

function savedBillSplitDay() {
  const raw = localStorage.getItem("party:v1:bill-split-day");
  expect(raw).toBeTruthy();
  return JSON.parse(raw as string) as { bills: Array<{ totalYen: number; shares: unknown[] }> };
}

async function changeSelect(select: HTMLSelectElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    valueSetter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function buttonByText(text: string) {
  return buttons().find((button) => button.textContent?.includes(text));
}

async function fillInput(placeholder: string, value: string) {
  const input = Array.from(document.querySelectorAll("input")).find((item) => item.getAttribute("placeholder") === placeholder);
  expect(input, `input with placeholder ${placeholder}`).toBeTruthy();
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
    input?.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function fillTextarea(value: string) {
  const textarea = document.querySelector<HTMLTextAreaElement>(".random-items-field textarea");
  expect(textarea, "random wheel textarea").toBeTruthy();
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    valueSetter?.call(textarea, value);
    textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    textarea?.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function stubReducedMotion() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}

function buttons() {
  return Array.from(document.querySelectorAll("button"));
}

function inputValues() {
  return Array.from(document.querySelectorAll("input")).map((input) => input.value);
}

function screenText() {
  return document.body.textContent ?? "";
}

function setupTopicText() {
  return document.querySelector(".topic-preview-card strong")?.textContent ?? "";
}

async function waitForText(text: string, timeoutMs = 200) {
  const attempts = Math.max(1, Math.ceil(timeoutMs / 10));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (screenText().includes(text)) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  expect(screenText()).toContain(text);
}
