// ── AI Client — Groq (free, fast, no billing required) ───────────────────────
// Uses VITE_GROQ_API_KEY from your .env file.
// Model: llama-3.3-70b-versatile — powerful and free on Groq's free tier.

import { Transaction } from "./db";

export interface InventoryContextItem {
  name: string;
  itemType: string;
  quantity: number | null;
  costPrice: number | null;
  sellingPrice: number;
  totalUnitsSold: number;
  totalLosses: number;
  isDeadStock: boolean;
  isLowStock: boolean;
  status: string | null;
}

export interface InventoryContext {
  items: InventoryContextItem[];
}

export interface AIRequestPayload {
  message: string;
  businessType?: string;
  businessName?: string;
  transactions?: Transaction[];
  totalIncome?: number;
  totalExpenses?: number;
  profit?: number;
  mode?: "chat" | "insights" | "coach";
  inventoryContext?: InventoryContext;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const MODEL = "llama-3.3-70b-versatile";
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a smart business advisor for LoopLink, a financial tracking app for small business owners in Nigeria.

Your role:
- Give practical, actionable business advice based on the user's real financial data
- Be concise but insightful — no fluff, no filler
- Focus on: business growth, cost reduction, profit improvement, and strategy
- Use the financial context provided (income, expenses, profit, transactions) in your responses
- Speak in a warm, direct tone — like a trusted advisor, not a textbook
- Format responses clearly: use short paragraphs or bullet points when listing items
- When referencing amounts, use ₦ (Naira) formatting
- Never make up financial figures — only reference data provided to you
- Keep responses under 300 words unless a detailed analysis is explicitly requested`;

function buildContextMessage(payload: AIRequestPayload): string {
  const parts: string[] = [];
  if (payload.businessName) parts.push(`Business: ${payload.businessName}`);
  if (payload.businessType) parts.push(`Type: ${payload.businessType}`);
  if (payload.totalIncome !== undefined) parts.push(`Total Income: ₦${payload.totalIncome.toLocaleString()}`);
  if (payload.totalExpenses !== undefined) parts.push(`Total Expenses: ₦${payload.totalExpenses.toLocaleString()}`);
  if (payload.profit !== undefined) parts.push(`Net Profit: ₦${payload.profit.toLocaleString()}`);
  if (payload.transactions?.length) {
    const recent = payload.transactions.slice(0, 20);
    const lines = recent.map(t =>
      `  - [${t.type.toUpperCase()}] ₦${t.amount.toLocaleString()} | ${t.description} | ${t.category}`
    ).join("\n");
    parts.push(`Recent Transactions:\n${lines}`);
  }
  if (payload.inventoryContext?.items?.length) {
    const lines = payload.inventoryContext.items.map(item => {
      const stockInfo = item.quantity !== null ? `${item.quantity} in stock` : "service";
      const flags = [
        item.isLowStock ? "LOW STOCK" : null,
        item.isDeadStock ? "DEAD STOCK" : null,
        item.totalLosses > 3 ? `${item.totalLosses} losses` : null,
      ].filter(Boolean).join(", ");
      return `  - ${item.name} (${item.itemType}): ${stockInfo} | Sell ₦${item.sellingPrice.toLocaleString()} | ${item.totalUnitsSold} sold${flags ? ` | ⚠ ${flags}` : ""}`;
    }).join("\n");
    parts.push(`[Inventory Context]\n${lines}`);
  }
  return parts.length > 0 ? `[Business Context]\n${parts.join("\n")}` : "";
}

function buildMessages(payload: AIRequestPayload, history: AIMessage[] = []) {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  const context = buildContextMessage(payload);
  if (context) messages.push({ role: "system", content: context });
  if (history.length) messages.push(...history.slice(-10));
  messages.push({ role: "user", content: payload.message });
  return messages;
}

function checkKey() {
  if (!GROQ_API_KEY || GROQ_API_KEY === "your_groq_api_key_here") {
    throw new Error("Groq API key not set. Add VITE_GROQ_API_KEY to your .env file and restart the dev server.");
  }
}

// ── Non-streaming request (insights, coach) ───────────────────────────────────
export async function aiRequest(payload: AIRequestPayload): Promise<string> {
  checkKey();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(payload),
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Groq error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Streaming request (chat UI) ───────────────────────────────────────────────
export async function aiStream(
  payload: AIRequestPayload,
  history: AIMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  checkKey();
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    signal,
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(payload, history),
      stream: true,
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(`Groq error (${res.status}): ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") break;
      try {
        const delta = JSON.parse(raw).choices?.[0]?.delta?.content ?? "";
        if (delta) { full += delta; onChunk(delta); }
      } catch { /* skip malformed chunks */ }
    }
  }

  return full;
}

// ── Simple response cache (5 min TTL) ────────────────────────────────────────
const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function aiRequestCached(payload: AIRequestPayload): Promise<string> {
  const key = JSON.stringify(payload);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;
  const value = await aiRequest(payload);
  cache.set(key, { value, ts: Date.now() });
  return value;
}
