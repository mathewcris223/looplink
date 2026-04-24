/**
 * Statement Parser — Upload & Understand
 * Parses CSV/Excel-like text and classifies transactions using AI
 * No external libraries — uses native browser APIs + Groq
 */

import { aiRequest } from "./aiClient";

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

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { cols.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    cols.push(current.trim());
    return cols;
  });
}

// ── Amount extractor ──────────────────────────────────────────────────────────
function extractAmount(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[₦$,\s]/g, "").replace(/[()]/g, "");
  return Math.abs(parseFloat(cleaned) || 0);
}

// ── Date normalizer ───────────────────────────────────────────────────────────
function normalizeDate(str: string): string {
  if (!str) return new Date().toISOString().split("T")[0];
  // Try common formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const cleaned = str.trim();
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];
  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) {
      try {
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      } catch { /* */ }
    }
  }
  return cleaned.split("T")[0] || new Date().toISOString().split("T")[0];
}

// ── Detect column indices from header ────────────────────────────────────────
function detectColumns(headers: string[]): {
  date: number; description: number; amount: number;
  credit: number; debit: number; balance: number;
} {
  const h = headers.map(h => h.toLowerCase().trim());
  const find = (...terms: string[]) => h.findIndex(col => terms.some(t => col.includes(t)));
  return {
    date: find("date", "time", "value date", "trans date"),
    description: find("description", "narration", "details", "particulars", "remarks", "memo"),
    amount: find("amount", "transaction amount", "trans amount"),
    credit: find("credit", "cr", "money in", "deposit"),
    debit: find("debit", "dr", "money out", "withdrawal"),
    balance: find("balance", "running balance"),
  };
}

// ── Rule-based classifier (fast, no API) ─────────────────────────────────────
function classifyLocally(desc: string, amount: number, isCredit: boolean | null): {
  type: "income" | "expense" | "transfer" | "unknown";
  category: string;
  isUnusual: boolean;
} {
  const d = desc.toLowerCase();

  // Transfer patterns
  if (d.includes("transfer") || d.includes("trf") || d.includes("interbank") || d.includes("nip")) {
    return { type: "transfer", category: "Transfer", isUnusual: false };
  }

  // Bank charges
  if (d.includes("charge") || d.includes("fee") || d.includes("vat") || d.includes("sms alert") || d.includes("maintenance")) {
    return { type: "expense", category: "Bank Charges", isUnusual: false };
  }

  // POS / ATM
  if (d.includes("pos") || d.includes("atm") || d.includes("withdrawal")) {
    return { type: "expense", category: "Cash/POS", isUnusual: false };
  }

  // Airtime / data
  if (d.includes("airtime") || d.includes("data") || d.includes("mtn") || d.includes("glo") || d.includes("airtel")) {
    return { type: "expense", category: "Airtime/Data", isUnusual: false };
  }

  // Salary / income
  if (d.includes("salary") || d.includes("payroll") || d.includes("payment from") || d.includes("credit alert")) {
    return { type: "income", category: "Income", isUnusual: false };
  }

  // Use credit/debit flag if available
  if (isCredit === true) return { type: "income", category: "Revenue", isUnusual: false };
  if (isCredit === false) return { type: "expense", category: "Expense", isUnusual: false };

  // Unusual: very large amounts
  const isUnusual = amount > 500000;
  return { type: "unknown", category: "Other", isUnusual };
}

// ── AI batch classifier ───────────────────────────────────────────────────────
async function classifyWithAI(rows: { desc: string; amount: number }[]): Promise<
  { type: "income" | "expense" | "transfer"; category: string }[]
> {
  const prompt = `Classify these Nigerian bank transactions. For each, return JSON with "type" (income/expense/transfer) and "category" (e.g. Revenue, Salary, Transport, Food, Airtime, Bank Charges, Transfer, Rent, etc).

Transactions:
${rows.map((r, i) => `${i + 1}. "${r.desc}" ₦${r.amount.toLocaleString()}`).join("\n")}

Return ONLY a JSON array like: [{"type":"expense","category":"Transport"},...]`;

  try {
    const response = await aiRequest({
      message: prompt,
      businessType: "general",
    });
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed;
    }
  } catch { /* fall back to local */ }
  return rows.map(r => classifyLocally(r.desc, r.amount, null));
}

// ── Remove duplicates ─────────────────────────────────────────────────────────
function deduplicateTransactions(txs: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  return txs.filter(tx => {
    const key = `${tx.date}-${tx.amount}-${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Detect patterns ───────────────────────────────────────────────────────────
function detectPatterns(txs: ParsedTransaction[]): string[] {
  const patterns: string[] = [];

  const bankCharges = txs.filter(t => t.category === "Bank Charges");
  if (bankCharges.length > 0) {
    const total = bankCharges.reduce((s, t) => s + t.amount, 0);
    patterns.push(`₦${total.toLocaleString()} spent on bank charges (${bankCharges.length} times)`);
  }

  const transfers = txs.filter(t => t.type === "transfer");
  if (transfers.length > 3) {
    patterns.push(`${transfers.length} transfers detected — review for personal vs business`);
  }

  const unusual = txs.filter(t => t.isUnusual);
  if (unusual.length > 0) {
    patterns.push(`${unusual.length} unusually large transaction${unusual.length > 1 ? "s" : ""} detected`);
  }

  // Repeated descriptions
  const descCount: Record<string, number> = {};
  txs.forEach(t => {
    const key = t.description.slice(0, 30).toLowerCase();
    descCount[key] = (descCount[key] || 0) + 1;
  });
  const repeated = Object.entries(descCount).filter(([, c]) => c >= 3);
  if (repeated.length > 0) {
    patterns.push(`Recurring payment: "${repeated[0][0]}" appears ${repeated[0][1]} times`);
  }

  return patterns;
}

// ── Main parse function ───────────────────────────────────────────────────────
export async function parseStatement(
  file: File,
  onProgress: (msg: string) => void
): Promise<{ transactions: ParsedTransaction[]; summary: StatementSummary }> {

  onProgress("Reading file…");
  const text = await file.text();

  onProgress("Detecting format…");
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("File appears empty or unreadable. Try a CSV export.");

  const headers = rows[0];
  const cols = detectColumns(headers);
  const dataRows = rows.slice(1).filter(r => r.some(c => c.trim()));

  onProgress(`Found ${dataRows.length} rows. Extracting transactions…`);

  // Build raw transactions
  const rawTxs: ParsedTransaction[] = dataRows.map((row, i) => {
    const desc = cols.description >= 0 ? row[cols.description] ?? "" : row.slice(1, 3).join(" ");
    const dateStr = cols.date >= 0 ? row[cols.date] ?? "" : "";

    let amount = 0;
    let isCredit: boolean | null = null;

    if (cols.credit >= 0 && cols.debit >= 0) {
      const credit = extractAmount(row[cols.credit] ?? "");
      const debit = extractAmount(row[cols.debit] ?? "");
      if (credit > 0) { amount = credit; isCredit = true; }
      else if (debit > 0) { amount = debit; isCredit = false; }
    } else if (cols.amount >= 0) {
      const raw = row[cols.amount] ?? "";
      amount = extractAmount(raw);
      // Negative = debit
      isCredit = !raw.includes("-") && !raw.includes("(");
    }

    const local = classifyLocally(desc, amount, isCredit);

    return {
      id: `tx_${i}`,
      date: normalizeDate(dateStr),
      description: desc.trim() || "Unknown",
      amount,
      type: local.type,
      category: local.category,
      isUnusual: local.isUnusual,
      rawLine: row.join(","),
    };
  }).filter(t => t.amount > 0);

  onProgress(`Classifying ${rawTxs.length} transactions with AI…`);

  // AI classify in batches of 20
  const BATCH = 20;
  for (let i = 0; i < rawTxs.length; i += BATCH) {
    const batch = rawTxs.slice(i, i + BATCH);
    try {
      const classified = await classifyWithAI(batch.map(t => ({ desc: t.description, amount: t.amount })));
      classified.forEach((c, j) => {
        if (rawTxs[i + j]) {
          rawTxs[i + j].type = c.type as ParsedTransaction["type"];
          rawTxs[i + j].category = c.category;
        }
      });
    } catch { /* keep local classification */ }
    onProgress(`Classified ${Math.min(i + BATCH, rawTxs.length)} of ${rawTxs.length}…`);
  }

  onProgress("Cleaning data…");
  const clean = deduplicateTransactions(rawTxs);
  const patterns = detectPatterns(clean);

  // Build summary
  const income = clean.filter(t => t.type === "income");
  const expenses = clean.filter(t => t.type === "expense");
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  // Top categories
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

  const summary: StatementSummary = {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    transactionCount: clean.length,
    unusualCount: clean.filter(t => t.isUnusual).length,
    topCategories,
    patterns,
  };

  onProgress("Done!");
  return { transactions: clean, summary };
}
