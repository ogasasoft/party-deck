import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "../components/PartyScreens";
import type { Player } from "../core/types";
import {
  billSplitWeightLabels,
  canCalculateSettlement,
  createSettlementTransfers,
  formatBillCopy,
  formatDayCopy,
  formatSettlementCopy,
  formatYen,
  reducedShareReasonLabels,
  splitBill,
  summarizeBillSplitDay,
  type BillSplitBill,
  type BillSplitDay,
  type BillSplitWeight,
  type ReducedShareReason
} from "../tools/billSplit";
import { clearBillSplitDay, loadBillSplitDay, saveBillSplitDay } from "../tools/billSplitStorage";

type Phase = "overview" | "edit" | "bill-result" | "day-result";

type ParticipantDraft = {
  player: Player;
  included: boolean;
  weight: BillSplitWeight;
  reducedReason?: ReducedShareReason;
};

type BillDraft = {
  billId: string | null;
  label: string;
  totalInput: string;
  payerId: string | null;
  participants: ParticipantDraft[];
};

export default function BillSplit(props: { players: Player[]; onHome: () => void }) {
  const [day, setDay] = useState<BillSplitDay>(() => loadBillSplitDay() ?? createDay());
  const [phase, setPhase] = useState<Phase>("overview");
  const [draft, setDraft] = useState<BillDraft | null>(null);
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const activeBill = day.bills.find((bill) => bill.id === activeBillId) ?? null;

  useEffect(() => saveBillSplitDay(day), [day]);

  function addBill() {
    setDraft(createDraft(props.players));
    setPhase("edit");
  }

  function editBill(bill: BillSplitBill) {
    setDraft(createDraft(props.players, bill));
    setPhase("edit");
  }

  function saveDraft() {
    if (!draft) return;
    const totalYen = parseAmount(draft.totalInput);
    const selected = draft.participants.filter((participant) => participant.included);
    if (!totalYen || selected.length < 2) return;
    const now = new Date().toISOString();
    const previous = draft.billId ? day.bills.find((bill) => bill.id === draft.billId) : null;
    const participants = selected.map(({ player, weight, reducedReason }) => ({
      id: player.id,
      nickname: player.nickname,
      color: player.color,
      weight,
      ...(weight === 0.5 && reducedReason ? { reducedReason } : {})
    }));
    const bill: BillSplitBill = {
      id: previous?.id ?? createId("bill"),
      label: draft.label.trim() || previous?.label || `${day.bills.length + 1}軒目`,
      totalYen,
      payerId: draft.payerId && participants.some((participant) => participant.id === draft.payerId) ? draft.payerId : null,
      participants,
      shares: splitBill(totalYen, participants),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now
    };
    setDay((current) => ({
      ...current,
      updatedAt: now,
      bills: previous ? current.bills.map((item) => (item.id === bill.id ? bill : item)) : [...current.bills, bill]
    }));
    setActiveBillId(bill.id);
    setDraft(null);
    setPhase("bill-result");
  }

  function removeBill(bill: BillSplitBill) {
    if (!window.confirm(`${bill.label}を削除しますか？`)) return;
    setDay((current) => ({ ...current, updatedAt: new Date().toISOString(), bills: current.bills.filter((item) => item.id !== bill.id) }));
    if (activeBillId === bill.id) setActiveBillId(null);
  }

  function finishDay() {
    if (!window.confirm("今日の割り勘を終了して、保存した会計を削除しますか？")) return;
    clearBillSplitDay();
    props.onHome();
  }

  if (phase === "edit" && draft) {
    return <BillEditor draft={draft} setDraft={setDraft} onCancel={() => setPhase("overview")} onSave={saveDraft} />;
  }
  if (phase === "bill-result" && activeBill) {
    return <BillResult bill={activeBill} onBack={() => setPhase("overview")} onEdit={() => editBill(activeBill)} />;
  }
  if (phase === "day-result") {
    return <DayResult day={day} onBack={() => setPhase("overview")} />;
  }
  return (
    <section className="screen">
      <Topbar title="今日の割り勘" eyebrow="便利ツール" onBack={props.onHome} />
      <div className="content bill-split-content">
        <section className="bill-summary-card">
          <span className="field-label">今日の会計</span>
          <strong>{formatYen(day.bills.reduce((sum, bill) => sum + bill.totalYen, 0))}</strong>
          <small>{day.bills.length ? `${day.bills.length}件を保存中` : "まず1軒目の会計を追加してください"}</small>
        </section>

        <div className="bill-list">
          {day.bills.map((bill) => {
            const payer = bill.participants.find((participant) => participant.id === bill.payerId);
            return (
              <article key={bill.id} className="bill-card">
                <div className="bill-card-heading">
                  <div>
                    <strong>{bill.label}</strong>
                    <span>{bill.participants.length}人・立替 {payer?.nickname ?? "未設定"}</span>
                  </div>
                  <b>{formatYen(bill.totalYen)}</b>
                </div>
                <div className="bill-card-actions">
                  <button type="button" className="secondary" onClick={() => { setActiveBillId(bill.id); setPhase("bill-result"); }}>結果を見る</button>
                  <button type="button" className="text-button" onClick={() => editBill(bill)}>編集</button>
                  <button type="button" className="text-button danger-text" onClick={() => removeBill(bill)}>削除</button>
                </div>
              </article>
            );
          })}
        </div>

        <button type="button" className="primary" onClick={addBill}>会計を追加</button>
        <button type="button" className="secondary" disabled={day.bills.length === 0} onClick={() => setPhase("day-result")}>一日の合計を見る</button>
        <button type="button" className="text-button danger-text bill-finish-button" onClick={finishDay}>今日の割り勘を終了</button>
      </div>
    </section>
  );
}

function BillEditor(props: { draft: BillDraft; setDraft: React.Dispatch<React.SetStateAction<BillDraft | null>>; onCancel: () => void; onSave: () => void }) {
  const selected = props.draft.participants.filter((participant) => participant.included);
  const totalYen = parseAmount(props.draft.totalInput);
  const canSave = Boolean(totalYen && selected.length >= 2);

  function updateParticipant(playerId: string, patch: Partial<ParticipantDraft>) {
    props.setDraft((draft) => draft ? {
      ...draft,
      payerId: patch.included === false && draft.payerId === playerId ? null : draft.payerId,
      participants: draft.participants.map((participant) => participant.player.id === playerId ? { ...participant, ...patch } : participant)
    } : draft);
  }

  return (
    <section className="screen">
      <Topbar title={props.draft.billId ? "会計を編集" : "会計を追加"} eyebrow="今日の割り勘" onBack={props.onCancel} />
      <div className="content bill-split-content">
        <label className="bill-field">
          <span className="field-label">お店・会計名</span>
          <input maxLength={40} placeholder="未入力なら1軒目" value={props.draft.label} onChange={(event) => props.setDraft((draft) => draft ? { ...draft, label: event.target.value } : draft)} />
        </label>
        <label className="bill-field">
          <span className="field-label">合計金額</span>
          <span className="money-input-wrap">
            <input
              className="money-input"
              inputMode="numeric"
              aria-label="合計金額"
              placeholder="0"
              value={formatAmountInput(props.draft.totalInput)}
              onChange={(event) => props.setDraft((draft) => draft ? { ...draft, totalInput: event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") } : draft)}
            />
            <b>円</b>
          </span>
        </label>

        <section className="bill-participants-section">
          <div className="section-heading">
            <div><span className="field-label">参加者と割合</span><strong>{selected.length}人参加</strong></div>
            {selected.length < 2 && <small className="danger-text">2人以上選んでください</small>}
          </div>
          <div className="bill-participant-list">
            {props.draft.participants.map((participant) => (
              <article key={participant.player.id} className={`bill-participant ${participant.included ? "included" : "excluded"}`}>
                <label className="bill-participant-toggle">
                  <input type="checkbox" checked={participant.included} onChange={(event) => updateParticipant(participant.player.id, { included: event.target.checked })} />
                  <span className="dot" style={{ "--chip-color": participant.player.color } as React.CSSProperties} />
                  <strong>{participant.player.nickname}</strong>
                </label>
                {participant.included && (
                  <>
                    <div className="bill-weight-options" aria-label={`${participant.player.nickname}の負担割合`}>
                      {([0.5, 1, 1.5] as BillSplitWeight[]).map((weight) => (
                        <button key={weight} type="button" className={participant.weight === weight ? "active" : ""} onClick={() => updateParticipant(participant.player.id, { weight, reducedReason: weight === 0.5 ? participant.reducedReason : undefined })}>
                          <span>{billSplitWeightLabels[String(weight) as `${BillSplitWeight}`]}</span><small>{weight}</small>
                        </button>
                      ))}
                    </div>
                    {participant.weight === 0.5 && (
                      <select aria-label={`${participant.player.nickname}が少なめの理由`} value={participant.reducedReason ?? ""} onChange={(event) => updateParticipant(participant.player.id, { reducedReason: event.target.value ? event.target.value as ReducedShareReason : undefined })}>
                        <option value="">理由なし</option>
                        {Object.entries(reducedShareReasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        </section>

        <label className="bill-field">
          <span className="field-label">立て替えた人（任意）</span>
          <select value={props.draft.payerId ?? ""} onChange={(event) => props.setDraft((draft) => draft ? { ...draft, payerId: event.target.value || null } : draft)}>
            <option value="">あとで決める</option>
            {selected.map((participant) => <option key={participant.player.id} value={participant.player.id}>{participant.player.nickname}</option>)}
          </select>
          <small>全てのお店で選ぶと、最後に誰が誰へ払うか計算できます。</small>
        </label>

        <button type="button" className="primary" disabled={!canSave} onClick={props.onSave}>このお店を計算</button>
      </div>
    </section>
  );
}

function BillResult(props: { bill: BillSplitBill; onBack: () => void; onEdit: () => void }) {
  const payer = props.bill.participants.find((participant) => participant.id === props.bill.payerId);
  return (
    <section className="screen">
      <Topbar title={props.bill.label} eyebrow="割り勘結果" onBack={props.onBack} />
      <div className="content bill-split-content">
        <section className="bill-summary-card">
          <span className="field-label">お店の合計</span>
          <strong>{formatYen(props.bill.totalYen)}</strong>
          <small>立替 {payer?.nickname ?? "未設定"}</small>
        </section>
        <div className="bill-share-list">
          {props.bill.shares.map((share) => (
            <div key={share.id} className="bill-share-row">
              <span className="dot" style={{ "--chip-color": share.color } as React.CSSProperties} />
              <div><strong>{share.nickname}</strong><small>{billSplitWeightLabels[String(share.weight) as `${BillSplitWeight}`]} {share.weight}{share.reducedReason ? `・${reducedShareReasonLabels[share.reducedReason]}` : ""}{share.receivedRemainder ? "・端数 +1円" : ""}</small></div>
              <b>{formatYen(share.amountYen)}</b>
            </div>
          ))}
        </div>
        <CopyButton text={formatBillCopy(props.bill)} label="このお店の結果をコピー" />
        <button type="button" className="secondary" onClick={props.onEdit}>編集する</button>
      </div>
    </section>
  );
}

function DayResult(props: { day: BillSplitDay; onBack: () => void }) {
  const rows = useMemo(() => summarizeBillSplitDay(props.day), [props.day]);
  const settlementReady = canCalculateSettlement(props.day);
  const transfers = settlementReady ? createSettlementTransfers(rows) : [];
  const names = new Map(rows.map((row) => [row.player.id, row.player.nickname]));
  return (
    <section className="screen">
      <Topbar title="一日の合計" eyebrow="今日の割り勘" onBack={props.onBack} />
      <div className="content bill-split-content">
        <section className="bill-summary-card">
          <span className="field-label">全{props.day.bills.length}件</span>
          <strong>{formatYen(props.day.bills.reduce((sum, bill) => sum + bill.totalYen, 0))}</strong>
          <small>{props.day.bills.map((bill) => bill.label).join("・")}</small>
        </section>
        <section className="bill-result-section">
          <h2>負担額合計</h2>
          <div className="bill-share-list">
            {rows.map((row) => (
              <div key={row.player.id} className="bill-share-row">
                <span className="dot" style={{ "--chip-color": row.player.color } as React.CSSProperties} />
                <strong>{row.player.nickname}</strong>
                <b>{formatYen(row.shareYen)}</b>
              </div>
            ))}
          </div>
          <CopyButton text={formatDayCopy(props.day)} label="一日の合計をコピー" />
        </section>

        <section className="bill-result-section">
          <h2>最終精算</h2>
          {!settlementReady ? (
            <div className="notice">最終精算を出すには、すべてのお店で立て替えた人を選んでください。</div>
          ) : (
            <>
              <div className="settlement-list">
                {transfers.length === 0 && <div className="notice">追加の精算はありません。</div>}
                {transfers.map((transfer, index) => (
                  <div key={`${transfer.fromPlayerId}-${transfer.toPlayerId}-${index}`} className="settlement-row">
                    <strong>{names.get(transfer.fromPlayerId)} → {names.get(transfer.toPlayerId)}</strong>
                    <b>{formatYen(transfer.amountYen)}</b>
                  </div>
                ))}
              </div>
              <CopyButton text={formatSettlementCopy(props.day)} label="最終精算をコピー" />
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function CopyButton(props: { text: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(props.text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("failed");
    }
  }
  return (
    <div className="copy-block">
      <button type="button" className="primary" onClick={() => void copy()}>{status === "copied" ? "コピーしました" : props.label}</button>
      {status === "failed" && <textarea readOnly value={props.text} onFocus={(event) => event.currentTarget.select()} aria-label="コピー用テキスト" />}
    </div>
  );
}

function createDay(): BillSplitDay {
  const now = new Date().toISOString();
  return { version: 1, id: createId("day"), startedAt: now, updatedAt: now, bills: [] };
}

function createDraft(players: Player[], bill?: BillSplitBill): BillDraft {
  const previous = new Map(bill?.participants.map((participant) => [participant.id, participant]));
  return {
    billId: bill?.id ?? null,
    label: bill?.label ?? "",
    totalInput: bill ? String(bill.totalYen) : "",
    payerId: bill?.payerId ?? null,
    participants: players.map((player) => {
      const saved = previous.get(player.id);
      return { player, included: bill ? Boolean(saved) : true, weight: saved?.weight ?? 1, reducedReason: saved?.reducedReason };
    })
  };
}

function parseAmount(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function formatAmountInput(value: string) {
  const amount = parseAmount(value);
  return amount ? amount.toLocaleString("ja-JP") : value;
}

function createId(prefix: string) {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

