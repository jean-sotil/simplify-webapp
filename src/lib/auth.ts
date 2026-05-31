import { AuthSessionMissingError, type Session, type User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (error instanceof AuthSessionMissingError) return null;
    throw error;
  }
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error instanceof AuthSessionMissingError) return null;
    throw error;
  }
  return data.user;
}
