// ── useVoiceInput — simple per-field voice input hook ────────────────────────
// Uses Web Speech API (Chrome/Edge). Falls back gracefully on other browsers.

import { useState, useRef, useCallback } from "react";

type Status = "idle" | "listening" | "error";

export interface UseVoiceInputOptions {
  onResult: (text: string) => void;
  transform?: (text: string) => string;
}

// Extract first number found in speech (e.g. "fifty thousand" → "50000")
export function extractNumber(text: string): string {
  const wordMap: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
    "ten thousand": 10000, "hundred thousand": 100000,
  };
  let t = text.toLowerCase().trim();
  // Replace word numbers
  for (const [word, val] of Object.entries(wordMap)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, "g"), String(val));
  }
  // "50k" → "50000"
  t = t.replace(/(\d+(?:\.\d+)?)\s*k\b/i, (_, n) => String(parseFloat(n) * 1000));
  // "1.5m" → "1500000"
  t = t.replace(/(\d+(?:\.\d+)?)\s*m\b/i, (_, n) => String(parseFloat(n) * 1000000));
  // Remove commas
  t = t.replace(/,/g, "");
  const match = t.match(/\d+(?:\.\d+)?/);
  return match ? match[0] : text;
}

const SR = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

export function useVoiceInput({ onResult, transform }: UseVoiceInputOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const recRef = useRef<any>(null);

  const isSupported = !!SR;

  const start = useCallback(() => {
    if (!SR) {
      setErrorMsg("Voice input requires Chrome or Edge.");
      setStatus("error");
      return;
    }
    setErrorMsg("");
    setStatus("listening");
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript.trim();
      const value = transform ? transform(text) : text;
      onResult(value);
      setStatus("idle");
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") {
        setErrorMsg("No speech detected. Try again.");
      } else if (e.error === "not-allowed") {
        setErrorMsg("Microphone access denied.");
      } else {
        setErrorMsg("Could not capture audio. Try again.");
      }
      setStatus("error");
    };

    rec.onend = () => {
      if (status === "listening") setStatus("idle");
    };

    rec.start();
  }, [onResult, transform, status]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setStatus("idle");
  }, []);

  return { status, errorMsg, isSupported, start, stop };
}
