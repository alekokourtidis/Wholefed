"use client";

import { useRouter } from "next/navigation";
import { setPro } from "../../lib/scans";

const features = [
  { icon: "all_inclusive", text: "Unlimited meal scans" },
  { icon: "labs", text: "Bloodwork integration" },
  { icon: "history", text: "Full scan history" },
  { icon: "psychology", text: "Deep nutrient insights" },
  { icon: "swap_horiz", text: "Smart food swaps" },
];

export default function SubscribePage() {
  const router = useRouter();

  const handleSubscribe = () => {
    // TODO: RevenueCat / Apple IAP
    // For now, unlock locally
    setPro(true);
    router.push("/");
  };

  return (
    <div className="fixed inset-0 bg-surface text-on-surface flex flex-col">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.4em] text-xs uppercase mb-12">
          WHOLEFED
        </h1>

        {/* Main pitch */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extralight text-[#e5e2e1] leading-tight mb-3">
            Know what you&apos;re<br />really eating
          </h2>
          <p className="text-[14px] font-light text-[#8a8578] leading-relaxed">
            Unlock the full picture behind every meal.
          </p>
        </div>

        {/* Feature list */}
        <div className="w-full max-w-xs space-y-4 mb-10">
          {features.map((f) => (
            <div key={f.text} className="flex items-center gap-4">
              <span
                className="material-symbols-outlined text-[#6b7a5e] text-lg"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
              >
                {f.icon}
              </span>
              <span className="text-[14px] font-light text-[#d4cfc4]">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <p className="text-[11px] text-[#8a8578]/50 italic">
          Join thousands making smarter food choices
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-12 pt-4">
        {/* Price */}
        <div className="text-center mb-5">
          <span className="text-2xl font-light text-[#e5e2e1]">$4.99</span>
          <span className="text-[13px] font-light text-[#8a8578]"> / month</span>
        </div>

        {/* Subscribe button */}
        <button
          onClick={handleSubscribe}
          className="w-full py-4 rounded-2xl bg-[#6b7a5e] text-white text-[14px] font-medium tracking-wide active:bg-[#5a6a4e] transition-colors"
        >
          Start Pro
        </button>

        {/* Restore + terms */}
        <div className="flex justify-center gap-6 mt-4">
          <button
            onClick={handleSubscribe}
            className="text-[11px] text-[#8a8578]/50 underline"
          >
            Restore Purchase
          </button>
          <span className="text-[11px] text-[#8a8578]/20">•</span>
          <button className="text-[11px] text-[#8a8578]/50 underline">
            Terms
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={() => router.back()}
          className="w-full text-center mt-4 text-[12px] text-[#8a8578]/40"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
