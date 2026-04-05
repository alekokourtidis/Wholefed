"use client";

import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="bg-surface text-on-surface min-h-screen pb-12">
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 pt-16 pb-3 bg-surface/80 backdrop-blur-xl border-b border-white/[0.04]">
        <button onClick={() => router.back()} className="text-[#bcccab] text-sm">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.2em] text-xs uppercase">Terms of Service</h1>
        <div className="w-6" />
      </header>

      <main className="px-6 pt-8 space-y-6 text-[13px] font-light text-[#acabaa] leading-relaxed">
        <p className="text-[10px] tracking-[0.15em] uppercase text-[#8a8578]">Last updated: April 2026</p>

        <section>
          <h2 className="text-[#e5e2e1] text-sm font-medium mb-2">Service</h2>
          <p>Wholefed is an AI-powered food scanning app that analyzes meal photos and provides nutritional insights. The service is provided &ldquo;as is&rdquo; without warranties of any kind.</p>
        </section>

        <section>
          <h2 className="text-[#e5e2e1] text-sm font-medium mb-2">Subscriptions</h2>
          <p>Free users receive 3 scans. Wholefed Pro ($4.99/month) provides unlimited scans. Subscriptions are managed through Apple and can be cancelled at any time in your device Settings under Subscriptions.</p>
        </section>

        <section>
          <h2 className="text-[#e5e2e1] text-sm font-medium mb-2">Not Medical Advice</h2>
          <p>Wholefed is for informational purposes only and does not constitute medical advice. AI analysis may contain inaccuracies. Do not rely on Wholefed for medical decisions. Consult a healthcare professional for dietary guidance.</p>
        </section>

        <section>
          <h2 className="text-[#e5e2e1] text-sm font-medium mb-2">Acceptable Use</h2>
          <p>You agree to use Wholefed only for its intended purpose of analyzing food and meals. Do not upload inappropriate or non-food images.</p>
        </section>

        <section>
          <h2 className="text-[#e5e2e1] text-sm font-medium mb-2">Limitation of Liability</h2>
          <p>Wholefed and its creators are not liable for any health outcomes resulting from use of the app. Nutritional analysis is approximate and should not replace professional guidance.</p>
        </section>

        <section>
          <h2 className="text-[#e5e2e1] text-sm font-medium mb-2">Contact</h2>
          <p>Questions? Contact us at support@wholefed.app</p>
        </section>
      </main>
    </div>
  );
}
