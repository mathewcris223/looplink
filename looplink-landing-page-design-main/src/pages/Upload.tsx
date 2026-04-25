/**
 * Upload & Understand — Bank Statement Analyzer
 * Upload CSV/Excel → AI classifies → Clean summary shown first → Drill-down available
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { addTransactionsBatch } from "@/lib/db";
import {
  Upload as UploadIcon, CheckCircle, AlertTriangle, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, MessageSquare
} from "lucide-react";
import type { ParsedTransaction, StatementSummary } from "@/lib/statementParser";
import { DataChat } from "@/components/upload/DataChat";

type Screen = "upload" | "processing" | "results";

const Upload = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [screen, setScreen] = useState<Screen>("upload");
  const [progress, setProgress] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [error, setError] = useState("");
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState("");

  // Safe redirect — wait for both auth AND business context to resolve
  useEffect(() => {
    if (!authLoading && !bizLoading && (!user || !activeBusiness)) {
      navigate("/login");
    }
  }, [authLoading, bizLoading, user, activeBusiness, navigate]);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    console.log("[Upload] File selected:", file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls", "txt"].includes(ext ?? "")) {
      setError("Unsupported file type. Please upload a CSV, Excel (.xlsx/.xls), or .txt file.");
      return;
    }

    setScreen("processing");
    setError("");
    setAutoSaved(false);
    setAutoSaveError("");
    setProgressStep(0);

    const steps = ["Reading file…", "Detecting format…", "Extracting transactions…", "Classifying with AI…", "Cleaning data…", "Done!"];
    let stepIdx = 0;

    try {
      const { parseStatement } = await import("@/lib/statementParser");
      const { transactions: txs, summary: sum } = await parseStatement(file, (msg) => {
        setProgress(msg);
        stepIdx = Math.min(stepIdx + 1, steps.length - 1);
        setProgressStep(stepIdx);
      });

      setTransactions(txs);
      setSummary(sum);

      // ── AUTO-SAVE to DB so AI chat can read it ──────────────────────────
      if (activeBusiness) {
        setProgress("Saving to your account…");
        try {
          const toSave = txs
            .filter(t => t.type === "income" || t.type === "expense")
            .map(t => ({
              type: t.type as "income" | "expense",
              amount: t.amount,
              description: t.description,
              category: t.category,
            }));
          console.log("[Upload] Auto-saving", toSave.length, "transactions to DB…");
          await addTransactionsBatch(activeBusiness.id, toSave);
          console.log("[Upload] Auto-save success");
          setAutoSaved(true);
        } catch (saveErr) {
          console.error("[Upload] Auto-save failed:", saveErr);
          setAutoSaveError("Saved locally but couldn't sync to account. Try again.");
        }
      }

      setScreen("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to process file. Try a CSV export from your bank.");
      setScreen("upload");
    }
  }, [activeBusiness]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const STEPS = ["Read", "Detect", "Extract", "Classify", "Clean", "Done"];

  // Don't render until auth AND business context resolve
  if (authLoading || bizLoading) return null;
  if (!user || !activeBusiness) return null;

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      <div className="max-w-lg mx-auto">

        {/* ── UPLOAD SCREEN ── */}
        {screen === "upload" && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold">Upload & Understand</h1>
              <p className="text-sm text-muted-foreground mt-1">Import any financial file — Aje reads it, classifies everything, and gives you instant insights</p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => { console.log("[Upload] Button clicked — opening file picker"); fileRef.current?.click(); }}
              className="border-2 border-dashed border-primary/30 rounded-3xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UploadIcon size={28} className="text-primary" />
              </div>
              <p className="text-base font-semibold mb-1">Tap to upload your file</p>
              <p className="text-sm text-muted-foreground">Bank statement, Excel (.xlsx), CSV, or .txt</p>
              <p className="text-xs text-muted-foreground mt-2">Or drag and drop here</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {error && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Feature showcase */}
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">What Aje does with your file</p>
              {[
                { icon: "⚡", text: "Extracts all transactions automatically — no manual entry" },
                { icon: "🏷️", text: "Categorizes income and expenses intelligently" },
                { icon: "🔍", text: "Detects patterns, recurring payments, and unusual transactions" },
                { icon: "📊", text: "Generates a clean summary: income, expenses, net balance" },
                { icon: "💬", text: "Chat with your data — ask questions in plain language" },
                { icon: "💾", text: "Save selected transactions directly to your account" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border">
                  <span className="text-base shrink-0">{icon}</span>
                  <p className="text-sm text-foreground font-medium">{text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PROCESSING SCREEN ── */}
        {screen === "processing" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            {/* Progress steps */}
            <div className="flex items-center gap-1.5 mb-8">
              {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    i < progressStep ? "bg-emerald-500 text-white" :
                    i === progressStep ? "bg-primary text-white animate-pulse" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < progressStep ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-4 h-0.5 ${i < progressStep ? "bg-emerald-500" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Loader2 size={28} className="text-primary animate-spin" />
            </div>
            <p className="text-base font-semibold mb-1">Analysing your statement</p>
            <p className="text-sm text-muted-foreground">{progress}</p>
          </div>
        )}

        {/* ── RESULTS SCREEN ── */}
        {screen === "results" && summary && (
          <>
            {/* Summary cards — shown FIRST */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold">File Summary</h1>
                <button onClick={() => { setScreen("upload"); setSaved(false); setTransactions([]); setSummary(null); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw size={13} /> New upload
                </button>
              </div>

              {/* Net balance — hero */}
              <div className={`rounded-2xl p-5 mb-3 ${summary.netBalance >= 0 ? "bg-emerald-500" : "bg-red-500"} text-white`}>
                <p className="text-xs font-medium opacity-80 mb-1">Net Balance</p>
                <p className="text-4xl font-bold">
                  {summary.netBalance >= 0 ? "+" : ""}₦{summary.netBalance.toLocaleString()}
                </p>
                <p className="text-xs opacity-70 mt-1">{summary.transactionCount} transactions analysed</p>
              </div>

              {/* Income / Expenses */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight size={14} className="text-emerald-600" />
                    <p className="text-xs text-emerald-700 font-medium">Total Income</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-700">₦{summary.totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownRight size={14} className="text-red-600" />
                    <p className="text-xs text-red-700 font-medium">Total Expenses</p>
                  </div>
                  <p className="text-xl font-bold text-red-600">₦{summary.totalExpenses.toLocaleString()}</p>
                </div>
              </div>

              {/* Patterns */}
              {summary.patterns.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-3">
                  <p className="text-xs font-bold text-amber-800 mb-2">🔍 Patterns detected</p>
                  {summary.patterns.map((p, i) => (
                    <p key={i} className="text-xs text-amber-700 mb-0.5">• {p}</p>
                  ))}
                </div>
              )}

              {/* Top categories */}
              {summary.topCategories.length > 0 && (
                <div className="bg-card border rounded-2xl px-4 py-3 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Top Categories</p>
                  <div className="space-y-2">
                    {summary.topCategories.map(cat => (
                      <div key={cat.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{cat.name} ({cat.count}×)</span>
                        <span className="font-semibold">₦{cat.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat with your data */}
            <DataChat
              transactions={transactions}
              summary={summary}
              onUpdateTransactions={setTransactions}
            />

            {/* Auto-save status + Chat CTA */}
            {autoSaved ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 mb-5">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">File ready. Ask anything.</p>
                    <p className="text-xs text-emerald-600">{transactions.filter(t => t.type === "income" || t.type === "expense").length} transactions saved to your account</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/chat")}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition-all">
                  <MessageSquare size={16} /> Chat with AI about this file
                </button>
              </div>
            ) : autoSaveError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 mb-5">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{autoSaveError}</p>
                </div>
                <button
                  onClick={() => {
                    const toSave = transactions
                      .filter(t => t.type === "income" || t.type === "expense")
                      .map(t => ({ type: t.type as "income" | "expense", amount: t.amount, description: t.description, category: t.category }));
                    if (activeBusiness) {
                      setAutoSaveError("");
                      addTransactionsBatch(activeBusiness.id, toSave)
                        .then(() => setAutoSaved(true))
                        .catch(() => setAutoSaveError("Sync failed again. Check your connection."));
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-red-500 text-white text-sm font-bold">
                  Retry sync
                </button>
              </div>
            ) : null}

            {/* Drill-down — transactions list */}
            <button onClick={() => setShowDrillDown(d => !d)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-card mb-2">
              <span className="text-sm font-semibold">View all transactions ({transactions.length})</span>
              {showDrillDown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDrillDown && (
              <div className="space-y-1.5 mb-6">
                {transactions.map(tx => (
                  <div key={tx.id} className={`flex items-center justify-between py-2.5 px-3 rounded-xl border text-sm ${
                    tx.isUnusual ? "bg-amber-50 border-amber-200" :
                    tx.type === "income" ? "bg-card border-border" :
                    tx.type === "expense" ? "bg-card border-border" :
                    "bg-muted/20 border-border"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-6 rounded-full shrink-0 ${
                        tx.type === "income" ? "bg-emerald-500" :
                        tx.type === "expense" ? "bg-red-400" :
                        "bg-muted-foreground"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{tx.description}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.category} · {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`text-xs font-bold ${tx.type === "income" ? "text-emerald-600" : tx.type === "expense" ? "text-red-500" : "text-muted-foreground"}`}>
                        ₦{tx.amount.toLocaleString()}
                      </p>
                      {tx.isUnusual && <p className="text-[10px] text-amber-600">⚠ Unusual</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Upload;
