/**
 * Statement Parser — Upload & Understand
 * Handles CSV, Excel (.xlsx/.xls), and .txt files
 * Uses SheetJS for Excel, native parsing for CSV/TXT
 * Deterministic: same file always produces same output (no AI classification)
 */

import * as XLSX from "xlsx";

export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer" | "unknown";
  category: string;
  isUnusual: boolean;
  rawLine: string;
}

export interface StatementSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  unusualCount: number;
  topCategories: { name: string; amount: number; count: number }[];
  patterns: string[];
}

// ── File → rows[][] using SheetJS for everything ──────────────────────────────
async function fileToRows(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false, // format everything as strings
  }) as string[][];
  return rows.filter(r => r.some(c => String(c).trim()));
}

// ── Amount extractor ──────────────────────────────────────────────────────────
function extractAmount(str: string): number {
  if (!str) return 0;
  const cleaned = String(str).replace(/[₦$£€,\s]/g, "").replace(/[()]/g, "");
  return Math.abs(parseFloat(cleaned) || 0);
}

// ── Date normalizer ───────────────────────────────────────────────────────────
function normalizeDate(str: string): string {
  if (!str) return new Date().toISOString().split("T")[0];
  const cleaned = String(str).trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.split("T")[0];
  // Try native Date parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return cleaned.split("T")[0] || new Date().toISOString().split("T")[0];
}

// ── Detect column indices from header row ─────────────────────────────────────
function detectColumns(headers: string[]): {
  date: number; description: number; amount: number;
  credit: number; debit: number; balance: number; id: number;
} {
  const h = headers.map(h => String(h).toLowerCase().trim());
  const find = (...terms: string[]) => h.findIndex(col => terms.some(t => col.includes(t)));
  return {
    id: find("transaction_id", "txn_id", "trans_id", "id", "ref"),
    date: find("date", "time", "value date", "trans date", "transaction date"),
    description: find("description", "narration", "details", "particulars", "remarks", "memo", "reference", "narrative", "product", "item", "goods", "service"),
    amount: find("amount", "transaction amount", "trans amount", "value", "sale amount", "price", "revenue", "total"),
    credit: find("credit", "cr", "money in", "deposit", "inflow"),
    debit: find("debit", "dr", "money out", "withdrawal", "outflow"),
    balance: find("balance", "running balance", "available balance"),
  };
}

// ── Rule-based classifier ─────────────────────────────────────────────────────
function classifyLocally(desc: string, amount: number, isCredit: boolean | null): {
  type: "income" | "expense" | "transfer" | "unknown";
  category: string;
  isUnusual: boolean;
} {
  const d = desc.toLowerCase();

  if (d.includes("transfer") || d.includes("trf") || d.includes("interbank") || d.includes("nip")) {
    return { type: "transfer", category: "Transfer", isUnusual: false };
  }
  if (d.includes("charge") || d.includes("fee") || d.includes("vat") || d.includes("sms alert") || d.includes("maintenance")) {
    return { type: "expense", category: "Bank Charges", isUnusual: false };
  }
  if (d.includes("pos") || d.includes("atm") || d.includes("withdrawal")) {
    return { type: "expense", category: "Cash/POS", isUnusual: false };
  }
  if (d.includes("airtime") || d.includes("data") || d.includes("mtn") || d.includes("glo") || d.includes("airtel")) {
    return { type: "expense", category: "Airtime/Data", isUnusual: false };
  }
  if (d.includes("salary") || d.includes("payroll") || d.includes("payment from") || d.includes("credit alert")) {
    return { type: "income", category: "Income", isUnusual: false };
  }
  if (isCredit === true) return { type: "income", category: "Revenue", isUnusual: false };
  if (isCredit === false) return { type: "expense", category: "Expense", isUnusual: false };

  return { type: "unknown", category: "Other", isUnusual: amount > 500000 };
}

// ── File fingerprint (deterministic hash) ────────────────────────────────────
async function hashFile(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Result cache (localStorage) ──────────────────────────────────────────────
const CACHE_PREFIX = "aje_stmt_v2_";  // bump version to invalidate old caches

function loadCache(hash: string): { transactions: ParsedTransaction[]; summary: StatementSummary } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + hash);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCache(hash: string, data: { transactions: ParsedTransaction[]; summary: StatementSummary }) {
  try {
    // Keep only last 5 cached files to avoid filling storage
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    if (keys.length >= 5) localStorage.removeItem(keys[0]);
    localStorage.setItem(CACHE_PREFIX + hash, JSON.stringify(data));
  } catch { /* storage full — skip cache */ }
}

// ── Deduplication — only remove truly identical rows (same id or same raw line) ──
function deduplicateTransactions(txs: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  return txs.filter(tx => {
    // Use rawLine as key — two rows are only duplicates if every cell matches
    const key = tx.rawLine;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Pattern detection ─────────────────────────────────────────────────────────
function detectPatterns(txs: ParsedTransaction[]): string[] {
  const patterns: string[] = [];
  const bankCharges = txs.filter(t => t.category === "Bank Charges");
  if (bankCharges.length > 0) {
    const total = bankCharges.reduce((s, t) => s + t.amount, 0);
    patterns.push(`₦${total.toLocaleString()} spent on bank charges (${bankCharges.length} times)`);
  }
  const transfers = txs.filter(t => t.type === "transfer");
  if (transfers.length > 3) patterns.push(`${transfers.length} transfers detected — review for personal vs business`);
  const unusual = txs.filter(t => t.isUnusual);
  if (unusual.length > 0) patterns.push(`${unusual.length} unusually large transaction${unusual.length > 1 ? "s" : ""} detected`);
  const descCount: Record<string, number> = {};
  txs.forEach(t => { const k = t.description.slice(0, 30).toLowerCase(); descCount[k] = (descCount[k] || 0) + 1; });
  const repeated = Object.entries(descCount).filter(([, c]) => c >= 3);
  if (repeated.length > 0) patterns.push(`Recurring payment: "${repeated[0][0]}" appears ${repeated[0][1]} times`);
  return patterns;
}

// ── Main parse function ───────────────────────────────────────────────────────
export async function parseStatement(
  file: File,
  onProgress: (msg: string) => void
): Promise<{ transactions: ParsedTransaction[]; summary: StatementSummary }> {

  onProgress("Reading file…");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["csv", "xlsx", "xls", "txt"].includes(ext)) {
    throw new Error("Unsupported file type. Please upload a CSV, Excel (.xlsx/.xls), or .txt file.");
  }

  // ── Check cache first — same file = instant identical result ──
  const buffer = await file.arrayBuffer();
  const hash = await hashFile(buffer);
  const cached = loadCache(hash);
  if (cached) {
    onProgress("Done!");
    return cached;
  }

  onProgress("Detecting format…");

  const rows = await fileToRows(file);
  if (rows.length < 2) throw new Error("File appears empty or has no data rows. Try a CSV export from your bank.");

  // Find the header row — skip blank/logo rows at the top
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    if (joined.includes("date") || joined.includes("description") || joined.includes("narration") ||
        joined.includes("amount") || joined.includes("credit") || joined.includes("debit")) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx].map(h => String(h));
  const cols = detectColumns(headers);
  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim()));

  onProgress(`Found ${dataRows.length} rows. Extracting transactions…`);

  // ── Pure deterministic extraction — no AI, same input = same output ──
  const rawTxs: ParsedTransaction[] = dataRows.map((row, i) => {
    // Use explicit id column if present, otherwise row index
    const rowId = cols.id >= 0 && String(row[cols.id] ?? "").trim()
      ? String(row[cols.id]).trim()
      : `tx_${i}`;

    // Build description — prefer dedicated desc column, fall back to joining all non-numeric non-date cols
    let desc = "";
    if (cols.description >= 0) {
      desc = String(row[cols.description] ?? "").trim();
    } else {
      // Fallback: join all string-looking columns (skip id, date, amount, credit, debit, balance)
      const skipCols = new Set([cols.id, cols.date, cols.amount, cols.credit, cols.debit, cols.balance].filter(c => c >= 0));
      desc = row.filter((_, idx) => !skipCols.has(idx)).map(String).filter(v => v.trim() && isNaN(Number(v))).join(" ").trim();
    }

    const dateStr = cols.date >= 0 ? String(row[cols.date] ?? "") : "";

    let amount = 0;
    let isCredit: boolean | null = null;

    if (cols.credit >= 0 && cols.debit >= 0) {
      const credit = extractAmount(String(row[cols.credit] ?? ""));
      const debit = extractAmount(String(row[cols.debit] ?? ""));
      if (credit > 0) { amount = credit; isCredit = true; }
      else if (debit > 0) { amount = debit; isCredit = false; }
    } else if (cols.amount >= 0) {
      const raw = String(row[cols.amount] ?? "");
      amount = extractAmount(raw);
      isCredit = !raw.includes("-") && !raw.includes("(");
    }

    const local = classifyLocally(desc, amount, isCredit);

    return {
      id: rowId,
      date: normalizeDate(dateStr),
      description: desc || "Unknown",
      amount,
      type: local.type,
      category: local.category,
      isUnusual: local.isUnusual,
      rawLine: row.map(String).join(","),
    };
  }).filter(t => t.amount > 0);

  if (rawTxs.length === 0) {
    throw new Error(
      "No transactions found. Make sure your file has columns like Date, Description, Amount (or Credit/Debit). Try exporting as CSV from your bank app."
    );
  }

  onProgress("Cleaning data…");
  const clean = deduplicateTransactions(rawTxs);
  const patterns = detectPatterns(clean);

  const income = clean.filter(t => t.type === "income");
  const expenses = clean.filter(t => t.type === "expense");
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  const catMap: Record<string, { amount: number; count: number }> = {};
  clean.forEach(t => {
    if (!catMap[t.category]) catMap[t.category] = { amount: 0, count: 0 };
    catMap[t.category].amount += t.amount;
    catMap[t.category].count++;
  });
  const topCategories = Object.entries(catMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const result = {
    transactions: clean,
    summary: {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: clean.length,
      unusualCount: clean.filter(t => t.isUnusual).length,
      topCategories,
      patterns,
    } as StatementSummary,
  };

  // ── Cache result so re-uploading same file is instant and identical ──
  saveCache(hash, result);

  onProgress("Done!");
  return result;
}
