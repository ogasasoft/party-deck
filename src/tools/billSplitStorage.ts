import type { BillSplitDay } from "./billSplit";

const BILL_SPLIT_DAY_KEY = "party:v1:bill-split-day";
export const BILL_SPLIT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function loadBillSplitDay(now = Date.now()): BillSplitDay | null {
  try {
    const raw = localStorage.getItem(BILL_SPLIT_DAY_KEY);
    if (!raw) return null;
    const day = JSON.parse(raw) as BillSplitDay;
    if (!isValidBillSplitDay(day) || now - Date.parse(day.updatedAt) > BILL_SPLIT_MAX_AGE_MS) {
      clearBillSplitDay();
      return null;
    }
    return day;
  } catch {
    clearBillSplitDay();
    return null;
  }
}

export function saveBillSplitDay(day: BillSplitDay) {
  localStorage.setItem(BILL_SPLIT_DAY_KEY, JSON.stringify(day));
}

export function clearBillSplitDay() {
  localStorage.removeItem(BILL_SPLIT_DAY_KEY);
}

function isValidBillSplitDay(value: unknown): value is BillSplitDay {
  if (!value || typeof value !== "object") return false;
  const day = value as Partial<BillSplitDay>;
  if (day.version !== 1 || typeof day.id !== "string" || typeof day.startedAt !== "string" || typeof day.updatedAt !== "string" || !Array.isArray(day.bills)) return false;
  if (!Number.isFinite(Date.parse(day.updatedAt))) return false;
  return day.bills.every((bill) => {
    if (!bill || typeof bill !== "object") return false;
    if (typeof bill.id !== "string" || typeof bill.label !== "string" || !Number.isSafeInteger(bill.totalYen) || bill.totalYen <= 0) return false;
    if (bill.payerId !== null && typeof bill.payerId !== "string") return false;
    if (!Array.isArray(bill.participants) || bill.participants.length < 2 || !Array.isArray(bill.shares) || bill.shares.length !== bill.participants.length) return false;
    return bill.shares.reduce((sum, share) => sum + share.amountYen, 0) === bill.totalYen;
  });
}

