// ── Voice Parser — converts natural speech into structured transaction data ──

export interface ParsedTransaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
}

export interface VoiceParseResult {
  transactions: ParsedTransaction[];
  rawText: string;
  confidence: "high" | "medium" | "low";
}

// ── Amount parsing ────────────────────────────────────────────────────────────
// Handles: "50k", "50,000", "50000", "fifty thousand", "20.5k"
function parseAmount(text: string): number | null {
  // Written numbers (basic)
  const written: Record<string, number> = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100,
    "thousand": 1000, "million": 1000000,
  };

  // "fifty thousand" → 50000
  let t = text.toLowerCase();
  for (const [word, val] of Object.entries(written)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, "g"), String(val));
  }

  // "20 000" or "20,000" → "20000"
  t = t.replace(/(\d)[,\s](\d{3})\b/g, "$1$2");

  // "50k" or "50 k" → 50000
  const kMatch = t.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;

  // "1.5m" → 1500000
  const mMatch = t.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  if (mMatch) return parseFloat(mMatch[1]) * 1000000;

  // Plain number
  const numMatch = t.match(/\b(\d{2,}(?:\.\d+)?)\b/);
  if (numMatch) return parseFloat(numMatch[1]);

  return null;
}

// ── Category detection ────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Transport: ["transport", "uber", "bolt", "taxi", "fuel", "petrol", "bus", "ride", "delivery", "logistics", "shipping"],
  Stock: ["stock", "inventory", "goods", "items", "products", "materials", "supplies", "raw", "ingredient", "ingredients"],
  Rent: ["rent", "lease", "space", "shop", "office", "store", "premises"],
  Staff: ["staff", "salary", "salaries", "worker", "employee", "wages", "pay", "labour", "labor"],
  Marketing: ["marketing", "advert", "ads", "promotion", "flyer", "social media", "instagram", "facebook", "campaign"],
  "Product Sale": ["sold", "sale", "sales", "product", "item", "bag", "shoe", "cloth", "food", "drink", "goods"],
  Service: ["service", "repair", "fix", "consult", "job", "work", "project", "client"],
  Commission: ["commission", "referral", "bonus", "tip"],
};

function detectCategory(text: string, type: "income" | "expense"): string {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      // Only return income categories for income and expense categories for expense
      const incomeCategories = ["Product Sale", "Service", "Commission"];
      const expenseCategories = ["Transport", "Stock", "Rent", "Staff", "Marketing"];
      if (type === "income" && incomeCategories.includes(cat)) return cat;
      if (type === "expense" && expenseCategories.includes(cat)) return cat;
    }
  }
  return "Other";
}

// ── Description extraction ────────────────────────────────────────────────────
function extractDescription(text: string, type: "income" | "expense"): string {
  const lower = text.toLowerCase();

  // Try to extract what comes after action keywords
  const incomePatterns = [
    /(?:sold|made from|earned from|received from|got from)\s+(.{3,40}?)(?:\s+for|\s+worth|\s+at|$)/i,
    /(?:sold|made|earned)\s+(.{3,30})/i,
  ];
  const expensePatterns = [
    /(?:spent on|paid for|bought|purchased)\s+(.{3,40}?)(?:\s+for|\s+worth|\s+at|$)/i,
    /(?:spent|paid|bought)\s+(.{3,30})/i,
    /(.{3,30}?)\s+(?:cost|was|were)\s+/i,
  ];

  const patterns = type === "income" ? incomePatterns : expensePatterns;
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match?.[1]) {
      // Clean up — remove amount references
      const cleaned = match[1]
        .replace(/\d+k?\b/gi, "")
        .replace(/naira|₦/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 2) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
  }

  // Fallback: use category-related words
  return type === "income" ? "Sales income" : "Business expense";
}

// ── Sentence splitter — handles "I sold X and spent Y" ───────────────────────
function splitStatements(text: string): string[] {
  // Split on conjunctions that likely separate different transactions
  const parts = text
    .split(/\band\b|\balso\b|\bthen\b|\bplus\b/i)
    .map(s => s.trim())
    .filter(s => s.length > 3);
  return parts.length > 0 ? parts : [text];
}

// ── Type detection ────────────────────────────────────────────────────────────
const INCOME_WORDS = ["sold", "made", "earned", "received", "got", "income", "revenue", "sales", "profit from", "collected"];
const EXPENSE_WORDS = ["spent", "bought", "paid", "purchased", "cost", "expense", "used", "transport", "rent", "salary"];

function detectType(text: string): "income" | "expense" | null {
  const lower = text.toLowerCase();
  const incomeScore = INCOME_WORDS.filter(w => lower.includes(w)).length;
  const expenseScore = EXPENSE_WORDS.filter(w => lower.includes(w)).length;
  if (incomeScore > expenseScore) return "income";
  if (expenseScore > incomeScore) return "expense";
  return null;
}

// ── Main parser ───────────────────────────────────────────────────────────────
export function parseVoiceInput(rawText: string): VoiceParseResult {
  const statements = splitStatements(rawText);
  const transactions: ParsedTransaction[] = [];

  for (const stmt of statements) {
    const type = detectType(stmt);
    if (!type) continue;

    const amount = parseAmount(stmt);
    if (!amount || amount <= 0) continue;

    const description = extractDescription(stmt, type);
    const category = detectCategory(stmt, type);

    transactions.push({ type, amount, description, category });
  }

  // Confidence scoring
  let confidence: VoiceParseResult["confidence"] = "low";
  if (transactions.length > 0) {
    const hasGoodDesc = transactions.every(t => t.description !== "Sales income" && t.description !== "Business expense");
    const hasCategory = transactions.every(t => t.category !== "Other");
    if (hasGoodDesc && hasCategory) confidence = "high";
    else if (transactions.length > 0) confidence = "medium";
  }

  return { transactions, rawText, confidence };
}
