"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPro } from "../../lib/scans";
import { purchasePro, restorePurchases } from "../../lib/subscription";

const features = [
  { icon: "labs", text: "Connect your bloodwork" },
  { icon: "all_inclusive", text: "Scan any meal, anytime" },
  { icon: "swap_horiz", text: "Get smarter swaps instantly" },
  { icon: "monitor_heart", text: "Insights tailored to your health" },
  { icon: "neurology", text: "See how nutrients interact" },
];

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    setLoading(true);
    setError("");
    const result = await purchasePro();
    if (result.success) {
      setPro(true);
      router.push("/");
    } else if (result.cancelled) {
      // User cancelled — do nothing
    } else if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    setError("");
    const result = await restorePurchases();
    if (result.success) {
      setPro(true);
      router.push("/");
    } else {
      setError("No previous subscription found");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-surface text-on-surface flex flex-col px-10">
      {/* Top — logo + title + subtitle */}
      <div className="pt-16 text-center">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.4em] text-xs uppercase mb-5">
          WHOLEFED
        </h1>
        <h2 className="text-[44px] font-extralight text-[#e5e2e1] leading-[1.1] mb-2">
          The Objective<br />Food App
        </h2>
        <p className="text-[14px] font-light text-[#6e6a61] leading-relaxed">
          Real health insights beyond calories and macros.
        </p>
        <div className="h-px bg-white/[0.06] mt-6" />
      </div>

      {/* Middle — features */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <div className="space-y-6">
          {features.map((f) => (
            <div key={f.text} className="flex items-center gap-4">
              <span
                className="material-symbols-outlined text-[#6b7a5e] text-[20px] w-8 flex items-center justify-center"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
              >
                {f.icon}
              </span>
              <span className="text-[15px] font-light text-[#d4cfc4]">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom — price + CTA */}
      <div className="pb-10">
        <div className="text-center mb-5">
          <p className="text-[12px] font-light text-[#bcccab] tracking-wide mb-2">
            3-day free trial
          </p>
          <span className="text-[36px] font-extralight text-[#e5e2e1]">$4.99</span>
          <span className="text-[15px] font-light text-[#8a8578]"> / month</span>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-[18px] rounded-2xl bg-[#7d8f70] text-white text-[16px] font-medium tracking-wide active:bg-[#6b7a5e] transition-colors disabled:opacity-50"
        >
          {loading ? "Processing..." : "Scan My First Meal Free"}
        </button>

        {error && (
          <p className="text-center text-[11px] text-red-400 mt-2">{error}</p>
        )}

        <p className="text-center text-[11px] text-[#8a8578]/40 mt-3">
          Cancel anytime. No charge during trial.
        </p>

        <div className="flex justify-center items-center gap-3 mt-4">
          <button onClick={handleRestore} disabled={loading} className="text-[11px] text-[#8a8578]/30">Restore</button>
          <span className="text-[11px] text-[#8a8578]/15">|</span>
          <button onClick={() => router.push("/terms")} className="text-[11px] text-[#8a8578]/30">Terms</button>
          <span className="text-[11px] text-[#8a8578]/15">|</span>
          <button onClick={() => router.push("/privacy")} className="text-[11px] text-[#8a8578]/30">Privacy</button>
        </div>

        <button
          onClick={() => router.back()}
          className="w-full text-center mt-3 text-[12px] text-[#8a8578]/25"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
