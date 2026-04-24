// ── Cash Mismatch Detection System ───────────────────────────────────────────
// Logic: Expected = opening_cash + today_income - today_expenses
// Mismatch = closing_cash - expected
// Negative mismatch = money is missing

import { supabase } from "./supabase";

export interface DailyCashRecord {
  id: string;
  business_id: string;
  user_id: string;
  date: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  status: "balanced" | "missing" | "surplus" | "incomplete";
  notes: string | null;
}

export interface CashMismatchResult {
  status: "balanced" | "missing" | "surplus" | "incomplete" | "no_record";
  openingCash: number;
  closingCash: number | null;
  expectedCash: number;
  difference: number | null;
  missingAmount: number;        // positive = money missing, 0 = balanced
  surplusAmount: number;        // positive = extra money (unrecorded income?)
  message: string;
  canClose: boolean;            // true if opening cash is set but closing isn't yet
}

// ── Get or create today's cash record ────────────────────────────────────────
export async function getTodayCashRecord(
  businessId: string,
  userId: string
): Promise<DailyCashRecord | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("daily_cash_records")
    .select("*")
    .eq("business_id", businessId)
    .eq("date", today)
    .single();
  return data as DailyCashRecord | null;
}

// ── Set opening cash (start of day) ──────────────────────────────────────────
export async function setOpeningCash(
  businessId: string,
  userId: string,
  openingCash: number
): Promise<DailyCashRecord> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("daily_cash_records")
    .upsert({
      business_id: businessId,
      user_id: userId,
      date: today,
      opening_cash: openingCash,
      status: "incomplete",
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id,date" })
    .select()
    .single();
  if (error) throw error;
  return data as DailyCashRecord;
}

// ── Set closing cash + calculate mismatch ────────────────────────────────────
export async function setClosingCash(
  businessId: string,
  userId: string,
  closingCash: number,
  todayIncome: number,
  todayExpenses: number
): Promise<DailyCashRecord> {
  const today = new Date().toISOString().split("T")[0];

  // Get existing record for opening cash
  const existing = await getTodayCashRecord(businessId, userId);
  const openingCash = existing?.opening_cash ?? 0;

  // Core formula
  const expectedCash = openingCash + todayIncome - todayExpenses;
  const difference = closingCash - expectedCash;

  // Status
  const TOLERANCE = 50; // ₦50 tolerance for rounding
  let status: DailyCashRecord["status"];
  if (Math.abs(difference) <= TOLERANCE) status = "balanced";
  else if (difference < 0) status = "missing";
  else status = "surplus";

  const { data, error } = await supabase
    .from("daily_cash_records")
    .upsert({
      business_id: businessId,
      user_id: userId,
      date: today,
      opening_cash: openingCash,
      closing_cash: closingCash,
      expected_cash: expectedCash,
      difference,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: "business_id,date" })
    .select()
    .single();
  if (error) throw error;
  return data as DailyCashRecord;
}

// ── Calculate mismatch from existing data (no DB write) ───────────────────────
export function calculateMismatch(
  record: DailyCashRecord | null,
  todayIncome: number,
  todayExpenses: number
): CashMismatchResult {
  // No record at all
  if (!record) {
    return {
      status: "no_record",
      openingCash: 0,
      closingCash: null,
      expectedCash: todayIncome - todayExpenses,
      difference: null,
      missingAmount: 0,
      surplusAmount: 0,
      message: "Set your opening cash to start tracking.",
      canClose: false,
    };
  }

  const expectedCash = record.opening_cash + todayIncome - todayExpenses;

  // Opening set but closing not yet entered
  if (record.closing_cash === null) {
    return {
      status: "incomplete",
      openingCash: record.opening_cash,
      closingCash: null,
      expectedCash,
      difference: null,
      missingAmount: 0,
      surplusAmount: 0,
      message: `You started with ₦${record.opening_cash.toLocaleString()}. Enter closing cash to check for missing money.`,
      canClose: true,
    };
  }

  const difference = record.closing_cash - expectedCash;
  const TOLERANCE = 50;

  if (Math.abs(difference) <= TOLERANCE) {
    return {
      status: "balanced",
      openingCash: record.opening_cash,
      closingCash: record.closing_cash,
      expectedCash,
      difference,
      missingAmount: 0,
      surplusAmount: 0,
      message: "You are balanced. All money is accounted for. ✓",
      canClose: false,
    };
  }

  if (difference < 0) {
    const missing = Math.abs(difference);
    return {
      status: "missing",
      openingCash: record.opening_cash,
      closingCash: record.closing_cash,
      expectedCash,
      difference,
      missingAmount: missing,
      surplusAmount: 0,
      message: `₦${missing.toLocaleString()} is missing. Check your records.`,
      canClose: false,
    };
  }

  return {
    status: "surplus",
    openingCash: record.opening_cash,
    closingCash: record.closing_cash,
    expectedCash,
    difference,
    missingAmount: 0,
    surplusAmount: difference,
    message: `₦${difference.toLocaleString()} extra. Did you forget to record some income?`,
    canClose: false,
  };
}

// ── Get last 7 days of cash records ──────────────────────────────────────────
export async function getRecentCashRecords(businessId: string): Promise<DailyCashRecord[]> {
  const { data } = await supabase
    .from("daily_cash_records")
    .select("*")
    .eq("business_id", businessId)
    .order("date", { ascending: false })
    .limit(7);
  return (data ?? []) as DailyCashRecord[];
}
