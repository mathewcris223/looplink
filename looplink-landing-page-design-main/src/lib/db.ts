import { supabase } from "./supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  user_id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  created_at: string;
}

export interface DailyEntry {
  id?: string;
  user_id?: string;
  sales: number;
  expenses: number;
  profit: number;
  created_at?: string;
}

// ── Businesses ───────────────────────────────────────────────────────────────

export async function createBusiness(name: string, type: string): Promise<Business> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("businesses")
    .insert({ user_id: user.id, name, type })
    .select()
    .single();
  if (error) throw error;
  return data as Business;
}

export async function getBusinesses(): Promise<Business[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Business[];
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function addTransaction(
  businessId: string,
  type: "income" | "expense",
  amount: number,
  description: string,
  category: string
): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("transactions")
    .insert({ business_id: businessId, user_id: user.id, type, amount, description, category })
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function getTransactions(businessId: string, limit = 50): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function getTransactionsByRange(
  businessId: string,
  from: string,
  to: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

// ── Legacy daily entries (kept for backward compat) ──────────────────────────

export async function saveDailyEntry(sales: number, expenses: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("daily_entries")
    .insert({ user_id: user.id, sales, expenses, profit: sales - expenses })
    .select()
    .single();
  if (error) throw error;
  return data as DailyEntry;
}

export async function getRecentEntries(limit = 7) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("daily_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyEntry[];
}
