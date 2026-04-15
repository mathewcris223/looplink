import { supabase } from "./supabase";

export interface DailyEntry {
  id?: string;
  user_id?: string;
  sales: number;
  expenses: number;
  profit: number;
  created_at?: string;
}

// ── Save a daily entry ───────────────────────────────────────────────────────
export async function saveDailyEntry(sales: number, expenses: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("daily_entries")
    .insert({
      user_id: user.id,
      sales,
      expenses,
      profit: sales - expenses,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DailyEntry;
}

// ── Fetch recent entries for current user ────────────────────────────────────
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
