// ── QuickVoiceEntry — speaks a full phrase and fills multiple fields ──────────
// e.g. "sold 5 shirts for 2000" → item=shirts, qty=5, price=2000

import { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

export interface VoiceFields {
  itemName?: string;
  quantity?: number;
  amount?: number;
}

interface Props {
  onResult: (fields: VoiceFields) => void;
  placeholder?: string;
}

const SR = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

// Parse a spoken phrase into structured fields
function parsePhrase(text: string): VoiceFields {
  const t = text.toLowerCase();
  const fields: VoiceFields = {};

  // Extract numbers
  const numStr = t
    .replace(/\bthousand\b/g, "000")
    .replace(/\bhundred\b/g, "00")
    .replace(/(\d+(?:\.\d+)?)\s*k\b/gi, (_, n) => String(parseFloat(n) * 1000));
  const nums = numStr.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  // If two numbers: first is quantity, second is amount
  if (nums.length >= 2) { fields.quantity = nums[0]; fields.amount = nums[1]; }
  else if (nums.length === 1) { fields.amount = nums[0]; }

  // Extract item name — look for noun after "sold", "sell", "of", or before "for"
  const patterns = [
    /(?:sold?|sell|selling)\s+\d+\s+([a-z][a-z\s]{1,20}?)(?:\s+for|\s+at|\s*$)/i,
    /\d+\s+([a-z][a-z\s]{1,20}?)\s+(?:for|at)/i,
    /(?:sold?|sell)\s+([a-z][a-z\s]{1,20})/i,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]?.trim().length >= 2) {
      fields.itemName = m[1].trim().replace(/\s+/g, " ");
      // Capitalise first letter
      fields.itemName = fields.itemName.charAt(0).toUpperCase() + fields.itemName.slice(1);
      break;
    }
  }

  return fields;
}

const QuickVoiceEntry = ({ onResult, placeholder = "e.g. sold 5 shirts for 2000" }: Props) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef<any>(null);

  if (!SR) return null;

  const start = () => {
    setError(""); setTranscript("");
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };

    rec.onend = () => {
      setListening(false);
      const t = transcript || "";
      if (!t.trim()) { setError("Didn't catch that — try again."); return; }
      const fields = parsePhrase(t);
      onResult(fields);
    };

    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "no-speech") setError("Mic error — try again.");
    };

    rec.start();
    setListening(true);
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={listening ? stop : start}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed transition-all duration-200 ${
          listening
            ? "border-red-400 bg-red-50 text-red-600"
            : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 text-primary"
        }`}
      >
        {listening
          ? <><MicOff size={16} className="animate-pulse" /> Stop listening</>
          : <><Mic size={16} /> Speak to fill form</>
        }
      </button>
      {listening && (
        <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground italic min-h-[28px]">
          {transcript || placeholder}
        </div>
      )}
      {error && <p className="text-xs text-amber-600">{error}</p>}
    </div>
  );
};

export default QuickVoiceEntry;
