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
  Upload as UploadIcon, CheckCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, Search
} from "lucide-react";
import type { ParsedTransaction, StatementSummary, UserColumnMapping, ColRole } from "@/lib/statementParser";
import { DataChat } from "@/components/upload/DataChat";

type Screen = "upload" | "mapping" | "processing" | "results";

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
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [autoSaveError, setAutoSaveError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<UserColumnMapping>({});

  // Safe redirect — wait for both auth AND business context to resolve
  useEffect(() => {
    if (authLoading || bizLoading) return; // still loading — do nothing
    if (!user) { navigate("/login"); return; }
    if (businesses.length === 0) { navigate("/onboarding"); return; }
    // activeBusiness will be set by BusinessContext — no redirect needed
  }, [authLoading, bizLoading, user, businesses, navigate]);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls", "txt"].includes(ext ?? "")) {
      setError("Unsupported file type. Please upload a CSV, Excel (.xlsx/.xls), or .txt file.");
      return;
    }
    setError("");
    // Preview headers first — show mapping screen
    try {
      const { previewFile } = await import("@/lib/statementParser");
      const { headers, previewRows: pRows } = await previewFile(file);
      setFileHeaders(headers);
      setPreviewRows(pRows);
      setPendingFile(file);
      // Auto-suggest mapping
      const autoMap: UserColumnMapping = {};
      headers.forEach((h, i) => {
        const col = h.toLowerCase().trim();
        if (col.includes("date") || col.includes("time")) autoMap[i] = "date";
        else if (col.includes("description") || col.includes("narration") || col.includes("details") ||
                 col.includes("product") || col.includes("item") || col.includes("jersey") || col.includes("match") || col.includes("type")) autoMap[i] = "description";
        else if (col.includes("revenue") || col.includes("income") || col.includes("sales") || col.includes("inflow") || col.includes("credit")) autoMap[i] = "income";
        else if (col.includes("total cost") || col.includes("other expense") || col.includes("expenditure") || col.includes("outflow") || col.includes("debit")) autoMap[i] = "expense";
        else autoMap[i] = "skip";
      });
      setColumnMapping(autoMap);
      setScreen("mapping");
    } catch {
      setError("Could not read file headers. Try a CSV export.");
    }
  }, []);

  const processFile = useCallback(async () => {
    if (!pendingFile) return;
    setScreen("processing");
    setError("");
    setAutoSaveError("");
    setProgressStep(0);
    let stepIdx = 0;
    try {
      const { parseStatement } = await import("@/lib/statementParser");
      const { transactions: txs, summary: sum } = await parseStatement(pendingFile, (msg) => {
        setProgress(msg);
        stepIdx = Math.min(stepIdx + 1, 5);
        setProgressStep(stepIdx);
      }, columnMapping);
      setTransactions(txs);
      setSummary(sum);
      setSelectedIds(null);
      setSaveStatus("idle");
      setAutoSaveError("");
      setScreen("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to process file. Try a CSV export from your bank.");
      setScreen("upload");
    }
  }, [pendingFile, columnMapping]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const STEPS = ["Read", "Detect", "Extract", "Classify", "Clean", "Done"];

  // Don't render until auth AND business context resolve
  if (authLoading || bizLoading) return null;
  if (!user || businesses.length === 0) return null;
  // Use activeBusiness or fall back to first business
  const business = activeBusiness ?? businesses[0];

  return (
    <AppShell businesses={businesses} activeBusiness={business} onSelectBusiness={setActiveBusiness}>
      <div className="max-w-lg mx-auto">

        {/* ── UPLOAD SCREEN ── */}
        {screen === "upload" && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold">Upload & Understand</h1>
              <p className="text-sm text-muted-foreground mt-1">Import any financial file — Aje reads it, classifies everything, and gives you instant insights</p>
            </div>

            {/* Drop zone — label wraps the input so clicking anywhere opens the picker */}
            <label
              htmlFor="file-upload"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-primary/30 rounded-3xl p-10 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all active:scale-[0.98] block"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <UploadIcon size={28} className="text-primary" />
              </div>
              <p className="text-base font-semibold mb-1">Tap to upload your file</p>
              <p className="text-sm text-muted-foreground">Bank statement, Excel (.xlsx), CSV, or .txt</p>
              <p className="text-xs text-muted-foreground mt-2">Or drag and drop here</p>
            </label>

            <input
              id="file-upload"
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

        {/* ── MAPPING SCREEN ── */}
        {screen === "mapping" && (
          <>
            <div className="mb-5">
              <button onClick={() => setScreen("upload")} className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                ← Back
              </button>
              <h1 className="text-xl font-bold">Confirm columns</h1>
              <p className="text-sm text-muted-foreground mt-1">Tell Aje what each column means so the numbers are accurate.</p>
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div className="overflow-x-auto mb-4 rounded-xl border">
                <table className="text-[10px] w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      {fileHeaders.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {fileHeaders.map((_, ci) => (
                          <td key={ci} className="px-2 py-1 text-muted-foreground whitespace-nowrap">{row[ci] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Column role selectors */}
            <div className="space-y-2 mb-6">
              {fileHeaders.map((header, i) => {
                const role = columnMapping[i] ?? "skip";
                const roleColors: Record<ColRole, string> = {
                  income: "bg-emerald-100 text-emerald-800 border-emerald-300",
                  expense: "bg-red-100 text-red-800 border-red-300",
                  date: "bg-blue-100 text-blue-800 border-blue-300",
                  description: "bg-violet-100 text-violet-800 border-violet-300",
                  skip: "bg-muted/40 text-muted-foreground border-border",
                };
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-36 truncate shrink-0">{header}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["income", "expense", "date", "description", "skip"] as ColRole[]).map(r => (
                        <button
                          key={r}
                          onClick={() => setColumnMapping(prev => ({ ...prev, [i]: r }))}
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                            role === r ? roleColors[r] : "bg-muted/20 text-muted-foreground border-border"
                          }`}
                        >
                          {r === "skip" ? "Skip" : r === "income" ? "Income ↑" : r === "expense" ? "Expense ↓" : r === "date" ? "Date" : "Description"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={processFile}
              disabled={!Object.values(columnMapping).some(r => r === "income" || r === "expense")}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-all">
              Process file
            </button>
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
            {/* Summary cards */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold">File Summary</h1>
                <button onClick={() => { setScreen("upload"); setTransactions([]); setSummary(null); setSelectedIds(null); setSaveStatus("idle"); setPendingFile(null); setFileHeaders([]); setPreviewRows([]); setColumnMapping({}); }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw size={13} /> New upload
                </button>
              </div>

              {/* Net balance */}
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

            {/* ── AI Chat with your data ── */}
            <DataChat
              transactions={transactions}
              summary={summary}
              selectedIds={selectedIds ?? new Set(transactions.filter(t => t.type === "income" || t.type === "expense").map(t => t.id))}
              onUpdateTransactions={(updated) => {
                setTransactions(updated);
                const eligible = updated.filter(t => t.type === "income" || t.type === "expense");
                setSelectedIds(new Set(eligible.map(t => t.id)));
              }}
              onUpdateSelection={(ids) => setSelectedIds(ids)}
            />

            {/* ── Transaction review — select which to add ── */}
            {(() => {
              const eligible = transactions.filter(t => t.type === "income" || t.type === "expense");
              const selected = selectedIds ?? new Set(eligible.map(t => t.id));
              const selectedCount = selected.size;
              const allSelected = selectedCount === eligible.length;
              const filtered = searchQuery.trim()
                ? eligible.filter(t =>
                    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.amount.toString().includes(searchQuery)
                  )
                : eligible;

              return (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold">Add to transaction history</p>
                      <p className="text-xs text-muted-foreground">{selectedCount} of {eligible.length} selected</p>
                    </div>
                    <button
                      onClick={() => setSelectedIds(allSelected ? new Set() : new Set(eligible.map(t => t.id)))}
                      className="text-xs text-primary font-medium">
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="flex items-center gap-2 bg-muted/40 border rounded-xl px-3 py-2 mb-3">
                    <Search size={13} className="text-muted-foreground shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search transactions…"
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-4 max-h-80 overflow-y-auto">
                    {filtered.map(tx => {
                      const isSelected = selected.has(tx.id);
                      return (
                        <div
                          key={tx.id}
                          onClick={() => {
                            const next = new Set(selected);
                            isSelected ? next.delete(tx.id) : next.add(tx.id);
                            setSelectedIds(next);
                          }}
                          className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] ${
                            isSelected ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border opacity-50"
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          }`}>
                            {isSelected && <CheckCircle size={10} className="text-primary-foreground" />}
                          </div>
                          <div className={`w-1.5 h-5 rounded-full shrink-0 ${tx.type === "income" ? "bg-emerald-500" : "bg-red-400"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{tx.description}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.category} · {tx.date}</p>
                          </div>
                          <p className={`text-xs font-bold shrink-0 ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                            ₦{tx.amount.toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save button */}
                  {saveStatus === "saved" ? (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                      <p className="text-sm font-semibold text-emerald-700">{selectedCount} transaction{selectedCount !== 1 ? "s" : ""} added to your history</p>
                    </div>
                  ) : (
                    <button
                      disabled={selectedCount === 0 || saveStatus === "saving"}
                      onClick={async () => {
                        const biz = activeBusiness ?? businesses[0];
                        if (!biz) return;
                        setSaveStatus("saving");
                        try {
                          const toSave = eligible
                            .filter(t => selected.has(t.id))
                            .map(t => ({ type: t.type as "income" | "expense", amount: t.amount, description: t.description, category: t.category }));
                          await addTransactionsBatch(biz.id, toSave);
                          setSaveStatus("saved");
                        } catch {
                          setSaveStatus("idle");
                          setAutoSaveError("Failed to save. Check your connection and try again.");
                        }
                      }}
                      className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                      {saveStatus === "saving" ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : `Add ${selectedCount} transaction${selectedCount !== 1 ? "s" : ""} to history`}
                    </button>
                  )}

                  {autoSaveError && (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{autoSaveError}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Upload;
