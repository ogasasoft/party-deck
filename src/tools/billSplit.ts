import type { Player } from "../core/types";

export type BillSplitWeight = 0.5 | 1 | 1.5;
export type ReducedShareReason = "non-drinker" | "late-join" | "early-leave" | "other";

export type BillSplitParticipant = Pick<Player, "id" | "nickname" | "color"> & {
  weight: BillSplitWeight;
  reducedReason?: ReducedShareReason;
};

export type BillSplitShare = BillSplitParticipant & {
  amountYen: number;
  receivedRemainder: boolean;
};

export type BillSplitBill = {
  id: string;
  label: string;
  totalYen: number;
  payerId: string | null;
  participants: BillSplitParticipant[];
  shares: BillSplitShare[];
  createdAt: string;
  updatedAt: string;
};

export type BillSplitDay = {
  version: 1;
  id: string;
  startedAt: string;
  updatedAt: string;
  bills: BillSplitBill[];
};

export type BillSplitDayRow = {
  player: Pick<Player, "id" | "nickname" | "color">;
  shareYen: number;
  paidYen: number;
  netYen: number;
};

export type SettlementTransfer = {
  fromPlayerId: string;
  toPlayerId: string;
  amountYen: number;
};

export const billSplitWeightLabels: Record<`${BillSplitWeight}`, string> = {
  "0.5": "少なめ",
  "1": "通常",
  "1.5": "多め"
};

export const reducedShareReasonLabels: Record<ReducedShareReason, string> = {
  "non-drinker": "飲んでいない",
  "late-join": "途中参加",
  "early-leave": "途中退出",
  other: "その他"
};

export function splitBill(
  totalYen: number,
  participants: BillSplitParticipant[],
  random: () => number = secureRandom
): BillSplitShare[] {
  if (!Number.isSafeInteger(totalYen) || totalYen <= 0) throw new Error("合計金額は1円以上の整数にしてください。");
  if (participants.length < 2) throw new Error("参加者を2人以上選んでください。");
  if (new Set(participants.map((participant) => participant.id)).size !== participants.length) throw new Error("参加者が重複しています。");

  const units = participants.map((participant) => weightUnits(participant.weight));
  const totalUnits = units.reduce((sum, value) => sum + value, 0);
  const rows = participants.map((participant, index) => {
    const numerator = totalYen * units[index];
    if (!Number.isSafeInteger(numerator)) throw new Error("金額が大きすぎます。");
    return {
      participant,
      amountYen: Math.floor(numerator / totalUnits),
      fractionNumerator: numerator % totalUnits,
      randomRank: random()
    };
  });
  const remainingYen = totalYen - rows.reduce((sum, row) => sum + row.amountYen, 0);
  const remainderRecipients = new Set(
    [...rows]
      .sort((left, right) => right.fractionNumerator - left.fractionNumerator || left.randomRank - right.randomRank)
      .slice(0, remainingYen)
      .map((row) => row.participant.id)
  );

  return rows.map((row) => ({
    ...row.participant,
    amountYen: row.amountYen + (remainderRecipients.has(row.participant.id) ? 1 : 0),
    receivedRemainder: remainderRecipients.has(row.participant.id)
  }));
}

export function summarizeBillSplitDay(day: BillSplitDay): BillSplitDayRow[] {
  const rows = new Map<string, BillSplitDayRow>();
  for (const bill of day.bills) {
    for (const share of bill.shares) {
      const current = rows.get(share.id) ?? {
        player: { id: share.id, nickname: share.nickname, color: share.color },
        shareYen: 0,
        paidYen: 0,
        netYen: 0
      };
      current.shareYen += share.amountYen;
      rows.set(share.id, current);
    }
    if (bill.payerId) {
      const payer = bill.participants.find((participant) => participant.id === bill.payerId);
      if (payer) {
        const current = rows.get(payer.id) ?? {
          player: { id: payer.id, nickname: payer.nickname, color: payer.color },
          shareYen: 0,
          paidYen: 0,
          netYen: 0
        };
        current.paidYen += bill.totalYen;
        rows.set(payer.id, current);
      }
    }
  }
  return [...rows.values()].map((row) => ({ ...row, netYen: row.paidYen - row.shareYen }));
}

export function canCalculateSettlement(day: BillSplitDay) {
  return day.bills.length > 0 && day.bills.every((bill) => Boolean(bill.payerId));
}

export function createSettlementTransfers(rows: BillSplitDayRow[]): SettlementTransfer[] {
  const debtors = rows
    .filter((row) => row.netYen < 0)
    .map((row) => ({ playerId: row.player.id, remainingYen: -row.netYen }))
    .sort((left, right) => right.remainingYen - left.remainingYen);
  const creditors = rows
    .filter((row) => row.netYen > 0)
    .map((row) => ({ playerId: row.player.id, remainingYen: row.netYen }))
    .sort((left, right) => right.remainingYen - left.remainingYen);
  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountYen = Math.min(debtor.remainingYen, creditor.remainingYen);
    if (amountYen > 0) transfers.push({ fromPlayerId: debtor.playerId, toPlayerId: creditor.playerId, amountYen });
    debtor.remainingYen -= amountYen;
    creditor.remainingYen -= amountYen;
    if (debtor.remainingYen === 0) debtorIndex += 1;
    if (creditor.remainingYen === 0) creditorIndex += 1;
  }
  return transfers;
}

export function formatBillCopy(bill: BillSplitBill) {
  const payer = bill.participants.find((participant) => participant.id === bill.payerId);
  const lines = [
    `【Party Deck 割り勘・${bill.label}】`,
    `合計：${formatYen(bill.totalYen)}`,
    `立替：${payer?.nickname ?? "未設定"}`,
    ""
  ];
  for (const share of bill.shares) {
    const reason = share.weight === 0.5 && share.reducedReason ? `・${reducedShareReasonLabels[share.reducedReason]}` : "";
    lines.push(`${share.nickname}：${formatYen(share.amountYen)}（${billSplitWeightLabels[String(share.weight) as `${BillSplitWeight}`]}${reason}）`);
  }
  if (bill.shares.some((share) => share.receivedRemainder)) {
    lines.push("", "※割り切れない1円は割合に沿って配分し、同じ条件の場合はランダムに決めました。");
  }
  return lines.join("\n");
}

export function formatDayCopy(day: BillSplitDay) {
  const rows = summarizeBillSplitDay(day);
  const totalYen = day.bills.reduce((sum, bill) => sum + bill.totalYen, 0);
  const lines = ["【Party Deck 一日の割り勘】", ...day.bills.map((bill) => `${bill.label}：${formatYen(bill.totalYen)}`), `合計：${formatYen(totalYen)}`, ""];
  for (const row of rows) lines.push(`${row.player.nickname}：${formatYen(row.shareYen)}`);
  return lines.join("\n");
}

export function formatSettlementCopy(day: BillSplitDay) {
  const rows = summarizeBillSplitDay(day);
  const transfers = createSettlementTransfers(rows);
  const names = new Map(rows.map((row) => [row.player.id, row.player.nickname]));
  const totalYen = day.bills.reduce((sum, bill) => sum + bill.totalYen, 0);
  const lines = ["【Party Deck 一日の最終精算】", `合計：${formatYen(totalYen)}`, ""];
  if (transfers.length === 0) lines.push("精算はありません。");
  for (const transfer of transfers) lines.push(`${names.get(transfer.fromPlayerId)} → ${names.get(transfer.toPlayerId)}：${formatYen(transfer.amountYen)}`);
  lines.push("", "内訳");
  for (const row of rows) lines.push(`${row.player.nickname}：負担${formatYen(row.shareYen)} / 立替${formatYen(row.paidYen)}`);
  return lines.join("\n");
}

export function formatYen(amountYen: number) {
  return `${amountYen.toLocaleString("ja-JP")}円`;
}

function weightUnits(weight: BillSplitWeight) {
  if (weight === 0.5) return 1;
  if (weight === 1) return 2;
  if (weight === 1.5) return 3;
  throw new Error("負担割合が無効です。");
}

function secureRandom() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}
