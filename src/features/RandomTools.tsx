import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "../components/PartyScreens";
import type { Player } from "../core/types";
import { flipCoin, formatWheelLabel, MAX_WHEEL_INPUT_CODE_UNITS, MAX_WHEEL_ITEM_GRAPHEMES, MAX_WHEEL_ITEMS, normalizeWheelItems, pickWheelIndex, rollDice, type CoinSide } from "../tools/randomTools";
import { loadWheelItemsText, saveWheelItemsText } from "../tools/randomToolsStorage";

type RandomToolTab = "wheel" | "coin" | "dice";

const wheelColors = ["#d64545", "#0f8b8d", "#f0b429", "#2e67b1", "#2d7d46", "#7c4dff", "#e76f51", "#4f5d75"];
const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export default function RandomTools(props: { players: Player[]; onHome: () => void }) {
  const [tab, setTab] = useState<RandomToolTab>("wheel");
  return (
    <section className="screen">
      <Topbar title="ランダムツール" eyebrow="便利ツール" onBack={props.onHome} />
      <div className="content random-tools-content">
        <nav className="random-tool-tabs" aria-label="ランダムツールを選ぶ">
          {(["wheel", "coin", "dice"] as RandomToolTab[]).map((item) => (
            <button key={item} type="button" className={tab === item ? "active" : ""} aria-pressed={tab === item} onClick={() => setTab(item)}>
              {item === "wheel" ? "ルーレット" : item === "coin" ? "コイン" : "サイコロ"}
            </button>
          ))}
        </nav>
        {tab === "wheel" && <WheelTool players={props.players} />}
        {tab === "coin" && <CoinTool />}
        {tab === "dice" && <DiceTool />}
      </div>
    </section>
  );
}

function WheelTool(props: { players: Player[] }) {
  const [itemsText, setItemsText] = useState(loadWheelItemsText);
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selected, setSelected] = useState<{ index: number; label: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const items = useMemo(() => normalizeWheelItems(itemsText), [itemsText]);

  useEffect(() => saveWheelItemsText(itemsText), [itemsText]);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  function updateItems(value: string) {
    setItemsText(value);
    setRemovedItems([]);
    setSelected(null);
  }

  function spin() {
    if (isSpinning || items.length < 2) return;
    const selectedIndex = pickWheelIndex(items.length);
    const segmentAngle = 360 / items.length;
    const target = normalizeDegrees(-(selectedIndex + 0.5) * segmentAngle);
    const current = normalizeDegrees(rotation);
    const delta = normalizeDegrees(target - current);
    setSelected(null);
    setIsSpinning(true);
    setRotation(rotation + 5 * 360 + delta);
    const duration = prefersReducedMotion() ? 120 : 2200;
    timerRef.current = window.setTimeout(() => {
      setSelected({ index: selectedIndex, label: items[selectedIndex] });
      setIsSpinning(false);
    }, duration);
  }

  function removeSelected() {
    if (!selected) return;
    const next = [...items];
    const [removed] = next.splice(selected.index, 1);
    setRemovedItems((current) => [...current, removed]);
    setItemsText(next.join("\n"));
    setSelected(null);
  }

  function restoreItems() {
    if (!removedItems.length) return;
    setItemsText([...items, ...removedItems].join("\n"));
    setRemovedItems([]);
    setSelected(null);
  }

  return (
    <section className="random-tool-panel">
      <div className="wheel-stage">
        <div className="wheel-pointer" aria-hidden="true">▼</div>
        {items.length >= 2 ? (
          <svg className={`random-wheel ${isSpinning ? "spinning" : ""}`} style={{ "--wheel-rotation": `${rotation}deg` } as React.CSSProperties} viewBox="0 0 300 300" role="img" aria-label={`${items.length}項目のルーレット`}>
            {items.map((item, index) => <WheelSegment key={`${item}-${index}`} label={item} index={index} count={items.length} />)}
            <circle cx="150" cy="150" r="22" fill="#fffaf2" stroke="#2a2722" strokeWidth="4" />
          </svg>
        ) : (
          <div className="wheel-empty">候補を2件以上入力</div>
        )}
      </div>
      <button type="button" className="primary random-main-action" disabled={items.length < 2 || isSpinning} onClick={spin}>{isSpinning ? "回転中…" : "ルーレットを回す"}</button>
      <div className="random-result-status" role="status" aria-live="polite" aria-atomic="true">
        {selected ? `選ばれたのは ${selected.label}` : ""}
      </div>
      {selected && (
        <section className="random-result-card">
          <span>選ばれたのは</span><strong>{selected.label}</strong>
          <div className="actions">
            <button type="button" className="secondary" onClick={spin}>もう一度</button>
            <button type="button" className="secondary" disabled={items.length <= 2} onClick={removeSelected}>候補から外す</button>
          </div>
        </section>
      )}
      <label className="random-items-field">
        <span className="field-label">候補（1行に1つ・最大{MAX_WHEEL_ITEMS}件・各{MAX_WHEEL_ITEM_GRAPHEMES}文字）</span>
        <textarea value={itemsText} maxLength={MAX_WHEEL_INPUT_CODE_UNITS} placeholder={"例：\nカラオケ\nダーツ\nもう一軒"} onChange={(event) => updateItems(event.target.value)} disabled={isSpinning} />
        <small>{items.length}/{MAX_WHEEL_ITEMS}件</small>
      </label>
      <div className="actions">
        <button type="button" className="secondary" disabled={isSpinning} onClick={() => updateItems(props.players.map((player) => player.nickname).join("\n"))}>登録プレイヤーを使う</button>
        <button type="button" className="secondary" disabled={!removedItems.length || isSpinning} onClick={restoreItems}>外した候補を戻す</button>
      </div>
    </section>
  );
}

function WheelSegment(props: { label: string; index: number; count: number }) {
  const segmentAngle = 360 / props.count;
  const startAngle = -90 + props.index * segmentAngle;
  const endAngle = startAngle + segmentAngle;
  const labelPoint = polarPoint(150, 150, 88, startAngle + segmentAngle / 2);
  const labelRotation = startAngle + segmentAngle / 2 + 90;
  const displayLabel = formatWheelLabel(props.label);
  return (
    <g>
      <path d={sectorPath(150, 150, 130, startAngle, endAngle)} fill={wheelColors[props.index % wheelColors.length]} stroke="#fffaf2" strokeWidth="2" />
      <text x={labelPoint.x} y={labelPoint.y} transform={`rotate(${labelRotation} ${labelPoint.x} ${labelPoint.y})`} textAnchor="middle" dominantBaseline="middle">{displayLabel}</text>
    </g>
  );
}

function CoinTool() {
  const [side, setSide] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [turn, setTurn] = useState(0);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  function toss() {
    if (isFlipping) return;
    const nextSide = flipCoin();
    setSide(null);
    setIsFlipping(true);
    setTurn((value) => value + 1);
    timerRef.current = window.setTimeout(() => { setSide(nextSide); setIsFlipping(false); }, prefersReducedMotion() ? 100 : 650);
  }

  return (
    <section className="random-tool-panel random-centered-panel">
      <div key={turn} className={`random-coin ${isFlipping ? "flipping" : ""}`} aria-hidden="true"><span>{side === "tails" ? "裏" : "表"}</span></div>
      <div className="random-result-label" aria-live="polite">{side ? <><span>結果</span><strong>{side === "heads" ? "表" : "裏"}</strong></> : <span>{isFlipping ? "コインを投げています…" : "タップしてコインを投げる"}</span>}</div>
      <button type="button" className="primary random-main-action" disabled={isFlipping} onClick={toss}>{isFlipping ? "回転中…" : "コインを投げる"}</button>
    </section>
  );
}

function DiceTool() {
  const [count, setCount] = useState(1);
  const [values, setValues] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [turn, setTurn] = useState(0);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  function roll() {
    if (isRolling) return;
    const nextValues = rollDice(count);
    setValues([]);
    setIsRolling(true);
    setTurn((value) => value + 1);
    timerRef.current = window.setTimeout(() => { setValues(nextValues); setIsRolling(false); }, prefersReducedMotion() ? 100 : 650);
  }

  return (
    <section className="random-tool-panel random-centered-panel">
      <div className="dice-count-setting">
        <span className="field-label">サイコロの数</span>
        <div className="random-count-buttons">
          {[1, 2, 3].map((value) => <button key={value} type="button" className={count === value ? "active" : ""} aria-pressed={count === value} disabled={isRolling} onClick={() => { setCount(value); setValues([]); }}>{value}個</button>)}
        </div>
      </div>
      <div key={turn} className={`random-dice-row ${isRolling ? "rolling" : ""}`} aria-label={values.length ? `出目 ${values.join("、")}` : "サイコロ"}>
        {(values.length ? values : Array.from({ length: count }, () => 1)).map((value, index) => <span key={index}>{diceFaces[value - 1]}</span>)}
      </div>
      <div className="random-result-label" aria-live="polite">
        {values.length ? <><span>合計</span><strong>{values.reduce((sum, value) => sum + value, 0)}</strong></> : <span>{isRolling ? "サイコロを振っています…" : "タップしてサイコロを振る"}</span>}
      </div>
      <button type="button" className="primary random-main-action" disabled={isRolling} onClick={roll}>{isRolling ? "回転中…" : "サイコロを振る"}</button>
    </section>
  );
}

function polarPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = angleDegrees * Math.PI / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function sectorPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, startAngle);
  const end = polarPoint(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
