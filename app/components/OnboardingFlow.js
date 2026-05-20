"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const STEPS = [
  {
    icon: "photo_camera",
    title: "Scan Any Meal",
    body: "Tap the round shutter button at the bottom of the home screen to take a photo of your meal. Wholefed reads it and gives you a health score.",
    path: "/",
  },
  {
    icon: "monitor_heart",
    title: "Add Your Health Conditions",
    body: "Add conditions like high cholesterol, diabetes, or IBS and Wholefed will personalize every insight to your body. Optional, but the analysis gets sharper.",
    path: "/profile",
  },
  {
    icon: "labs",
    title: "Upload Your Bloodwork",
    body: "Drop a photo of your lab results and Wholefed factors your real biomarkers into every scan. Privacy stays on-device unless you sign in.",
    path: "/profile",
  },
  {
    icon: "history",
    title: "Your Scans, Saved",
    body: "Every meal you scan is stored automatically here so you can look back at what you have been eating and how it scored.",
    path: "/history",
  },
  {
    icon: "restaurant",
    title: "Try It Now",
    body: "Back on the home screen, tap \"Try with a sample meal\" to see a full analysis instantly. Or use the photo icon next to the shutter to scan a picture from your library.",
    path: "/",
    final: true,
  },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("wholefed_onboarding_done") === "true";
    if (done) return;
    const t = setTimeout(() => setShow(true), 1000);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  const current = STEPS[step];

  // Skip the modal on pages where the onboarding is not meaningful
  // (subscribe paywall, results page, etc.). It comes back on /, /profile, /history.
  const validPaths = ["/", "/profile", "/history"];
  if (!validPaths.includes(pathname)) return null;

  const handleNext = () => {
    if (current.final) {
      localStorage.setItem("wholefed_onboarding_done", "true");
      setShow(false);
      return;
    }
    const nextIndex = step + 1;
    setStep(nextIndex);
    const targetPath = STEPS[nextIndex].path;
    if (targetPath && targetPath !== pathname) {
      router.push(targetPath);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("wholefed_onboarding_done", "true");
    setShow(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl flex items-center justify-center px-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="bg-[#1c2623]/80 border border-white/[0.06] rounded-3xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#6b7a5e]/20 flex items-center justify-center mx-auto">
            <span
              className="material-symbols-outlined text-[#bcccab] text-3xl"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
            >
              {current.icon}
            </span>
          </div>
          <h2 className="text-xl font-light text-[#e5e2e1] tracking-wide">{current.title}</h2>
          <p className="text-sm font-light text-[#acabaa] leading-relaxed">{current.body}</p>
          <button
            onClick={handleNext}
            className="w-full py-3.5 rounded-xl bg-[#6b7a5e] text-white text-[14px] font-medium tracking-wide active:scale-[0.98] transition-all"
          >
            {current.final ? "Let's go" : "Got it"}
          </button>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? "16px" : "6px",
                  height: "6px",
                  backgroundColor: i === step ? "#bcccab" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </div>
        {!current.final && (
          <button
            onClick={handleSkip}
            className="w-full text-center text-[12px] font-light text-[#8a8578]/60 py-2"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
