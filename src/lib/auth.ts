import { AuthSessionMissingError, type Session, type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/db";

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (error instanceof AuthSessionMissingError) return null;
    throw error;
  }
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (error instanceof AuthSessionMissingError) return null;
    throw error;
  }
  return data.user;
}
