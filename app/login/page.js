"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { error: err } = await signInWithEmail(email.trim());
      if (err) {
        setError(err.message || "We couldn't send your link right now. Please try again in a moment.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#bcccab]/70">
            Optional
          </p>
          <h1 className="text-2xl font-extralight text-[#e5e2e1] tracking-wide">
            Sync Across Devices
          </h1>
          <p className="text-[13px] font-light text-[#8a8578]">
            Wholefed works fully without an account. Sign in only if you want your scans on multiple devices.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#6b7a5e]/20 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[#bcccab] text-3xl">mail</span>
            </div>
            <p className="text-[14px] font-light text-[#d4cfc4]">
              Check your email for a magic link
            </p>
            <p className="text-[12px] font-light text-[#8a8578]">
              {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[14px] font-light text-[#d4cfc4] placeholder:text-[#8a8578]/40 outline-none focus:border-[#6b7a5e]/40 transition-colors"
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-xl bg-[#6b7a5e] text-white text-[14px] font-medium tracking-wide active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {loading ? "Sending..." : "Continue with Email"}
            </button>
          </form>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full text-center text-[12px] font-light text-[#8a8578] py-2"
        >
          Continue without account
        </button>
      </div>
    </div>
  );
}
