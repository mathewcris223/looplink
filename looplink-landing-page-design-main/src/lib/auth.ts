import { supabase } from "./supabase";

// ── Sign Up ──────────────────────────────────────────────────────────────────
export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name }, // stored in auth.users raw_user_meta_data
    },
  });

  if (error) throw error;

  // Also write to public profiles table so we can query it easily
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: name,
      email,
    });
    if (profileError) console.warn("Profile upsert failed:", profileError.message);
  }

  return data;
}

// ── Log In ───────────────────────────────────────────────────────────────────
export async function logIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Log Out ──────────────────────────────────────────────────────────────────
export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Get current session ──────────────────────────────────────────────────────
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
