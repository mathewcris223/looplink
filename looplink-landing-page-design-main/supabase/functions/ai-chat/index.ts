// ── LoopLink AI Chat — Supabase Edge Function ─────────────────────────────────
// Deployed at: /functions/v1/ai-chat
// The OpenAI API key is stored as a Supabase secret (never exposed to frontend).
//
// Deploy with:
//   supabase functions deploy ai-chat
//   supabase secrets set OPENAI_API_KEY=sk-...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MODEL = "gpt-4o-mini"; // cost-effective, fast, smart

const SYSTEM_PROMPT = `You are a smart business advisor for LoopLink, a financial tracking app for small business owners in Nigeria.

Your role:
- Give practical, actionable business advice based on the user's real financial data
- Be concise but insightful — no fluff, no filler
- Focus on: business growth, cost reduction, profit improvement, and strategy
- Use the financial context provided (income, expenses, profit, transactions) in your responses
- Speak in a warm, direct tone — like a trusted advisor, not a textbook
- Format responses clearly: use short paragraphs or bullet points when listing items
- When referencing amounts, use ₦ (Naira) formatting
- If no financial data is provided, give general business advice
- Never make up financial figures — only reference data provided to you
- Keep responses under 300 words unless a detailed analysis is explicitly requested`;

interface Transaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

interface RequestBody {
  message: string;
  businessType?: string;
  businessName?: string;
  transactions?: Transaction[];
  totalIncome?: number;
  totalExpenses?: number;
  profit?: number;
  mode?: "chat" | "insights" | "coach";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  stream?: boolean;
}

function buildContextMessage(body: RequestBody): string {
  const parts: string[] = [];

  if (body.businessName) parts.push(`Business: ${body.businessName}`);
  if (body.businessType) parts.push(`Type: ${body.businessType}`);
  if (body.totalIncome !== undefined) parts.push(`Total Income: ₦${body.totalIncome.toLocaleString()}`);
  if (body.totalExpenses !== undefined) parts.push(`Total Expenses: ₦${body.totalExpenses.toLocaleString()}`);
  if (body.profit !== undefined) parts.push(`Net Profit: ₦${body.profit.toLocaleString()}`);

  if (body.transactions && body.transactions.length > 0) {
    const recent = body.transactions.slice(0, 20);
    const txLines = recent.map(t =>
      `  - [${t.type.toUpperCase()}] ₦${t.amount.toLocaleString()} | ${t.description} | ${t.category} | ${new Date(t.created_at).toLocaleDateString("en-GB")}`
    ).join("\n");
    parts.push(`Recent Transactions (last ${recent.length}):\n${txLines}`);
  }

  return parts.length > 0 ? `[Business Context]\n${parts.join("\n")}` : "";
}

function buildMessages(body: RequestBody) {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Inject business context as a system-level context message
  const context = buildContextMessage(body);
  if (context) {
    messages.push({ role: "system", content: context });
  }

  // Add conversation history
  if (body.history && body.history.length > 0) {
    // Limit history to last 10 messages to control token usage
    const trimmed = body.history.slice(-10);
    messages.push(...trimmed);
  }

  // Add the current user message
  messages.push({ role: "user", content: body.message });

  return messages;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured. Run: supabase secrets set OPENAI_API_KEY=sk-..." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = buildMessages(body);
  const shouldStream = body.stream === true;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: shouldStream,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${err}` }), {
        status: openaiRes.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (shouldStream) {
      // Pass the SSE stream directly to the client
      return new Response(openaiRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      const data = await openaiRes.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ content }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
