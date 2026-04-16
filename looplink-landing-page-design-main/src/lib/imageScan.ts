// ── Image Scan — extract transaction data from a receipt/image via Groq AI ───
// Converts image to base64, sends to Groq vision model, parses JSON response.

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

export interface ScannedData {
  amount?: number;
  itemName?: string;
  quantity?: number;
  type?: "income" | "expense";
  date?: string;
  rawText?: string;
}

async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function scanImageForTransaction(file: File): Promise<ScannedData> {
  if (!GROQ_API_KEY) throw new Error("AI not configured.");

  const base64 = await imageToBase64(file);
  const mimeType = file.type || "image/jpeg";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Look at this receipt, invoice, or note image. Extract the key financial details and return ONLY a valid JSON object with these fields (omit any field you cannot find):
{
  "amount": number (total amount in the document),
  "itemName": string (main item or description),
  "quantity": number (quantity if visible),
  "type": "income" or "expense" (guess based on context — receipt of purchase = expense, sale receipt = income),
  "date": string (date if visible, format: YYYY-MM-DD)
}
Return ONLY the JSON object, no explanation.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    // If vision not supported, return empty so UI shows manual fallback
    if (res.status === 400 || res.status === 422) {
      return { rawText: "Image scanning requires a vision-capable model. Please enter details manually." };
    }
    throw new Error(`Scan failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Parse JSON from response
  const match = content.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as ScannedData;
      return parsed;
    } catch {
      return { rawText: content };
    }
  }

  return { rawText: content };
}
