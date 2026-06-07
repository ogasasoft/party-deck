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
