import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addTransaction } from "@/lib/db";
import { X, Mic, MicOff } from "lucide-react";

const EXPENSE_CATEGORIES = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Other"];
const INCOME_CATEGORIES = ["Product Sale", "Service", "Commission", "Other"];

interface Props {
  businessId: string;
  defaultType: "income" | "expense";
  onClose: () => void;
  onSaved: () => void;
}

const AddTransactionModal = ({ businessId, defaultType, onClose, onSaved }: Props) => {
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Voice input
  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice input not supported in this browser."); return; }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    setListening(true);
    recognition.start();
    recognition.onresult = (e: any) => {
      const text: string = e.results[0][0].transcript.toLowerCase();
      setListening(false);
      // Parse: "sold 50k shoes" or "spent 10k on transport"
      const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*k?\b/);
      if (amountMatch) {
        const raw = parseFloat(amountMatch[1]);
        setAmount(text.includes("k") ? String(raw * 1000) : String(raw));
      }
      // Extract description
      const descMatch = text.match(/(?:sold|on|for)\s+(.+)/);
      if (descMatch) setDescription(descMatch[1]);
      // Detect type
      if (text.includes("sold") || text.includes("received") || text.includes("earned")) setType("income");
      if (text.includes("spent") || text.includes("paid") || text.includes("bought")) setType("expense");
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    if (!description.trim()) { setError("Enter a description."); return; }
    if (!category) { setError("Select a category."); return; }
    setLoading(true);
    try {
      await addTransaction(businessId, type, parseFloat(amount), description.trim(), category);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Add Transaction</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-5">
          {(["income", "expense"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                type === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (₦)</label>
            <input
              type="number" min="0" placeholder="e.g. 15000"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{type === "income" ? "What was sold / source" : "What was it for"}</label>
              <button
                type="button" onClick={handleVoice}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${listening ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {listening ? <><MicOff size={12} /> Listening…</> : <><Mic size={12} /> Voice</>}
              </button>
            </div>
            <input
              type="text" placeholder={type === "income" ? "e.g. Sold 10 bags" : "e.g. Bought stock"}
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    category === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}

          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving…" : `Save ${type === "income" ? "Income" : "Expense"}`}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
