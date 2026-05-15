"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getSupabase } from "./supabase";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function isReasonableEmail(email) {
  if (!EMAIL_RE.test(email)) return false;
  const domain = email.split("@")[1].toLowerCase();
  if (/\.(con|cmo|comm|coom|gmial|gmal)$/i.test(domain)) return false;
  return true;
}

export async function signInWithEmail(email) {
  const supabase = getSupabase();
  if (!supabase) return { error: { message: "Sign in is temporarily unavailable. Please try again later." } };

  if (!isReasonableEmail(email)) {
    return { error: { message: "Please enter a valid email address." } };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    return { error };
  } catch {
    return { error: { message: "Unable to connect. Please check your internet and try again." } };
  }
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}
