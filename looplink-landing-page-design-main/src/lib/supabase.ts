import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey ||
    supabaseUrl === "your_supabase_project_url" ||
    supabaseAnonKey === "your_supabase_anon_key") {
  console.warn(
    "[LoopLink] Supabase env vars not set. " +
    "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file. " +
    "Auth and database features will not work until then."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);
