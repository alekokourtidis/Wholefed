"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

const STEPS = [
  {
    path: "/",
    selector: '[data-onboarding="shutter"]',
    title: "Scan Any Meal",
    body: "Tap this shutter to take a picture of any meal. Wholefed reads it and returns a personalized health score.",
    pad: 16,
  },
  {
    path: "/",
    selector: '[data-onboarding="gallery"]',
    title: "Or Upload From Photos",
    body: "You can also pick a meal photo from your library here. Same scoring, no camera required.",
    pad: 10,
  },
  {
    path: "/profile",
    selector: '[data-onboarding="conditions"]',
    title: "Add Health Conditions",
    body: "Add conditions like high cholesterol, diabetes, or IBS. Wholefed personalizes every insight to your body.",
    pad: 8,
  },
  {
    path: "/profile",
    selector: '[data-onboarding="bloodwork"]',
    title: "Upload Your Bloodwork",
    body: "Drop a photo of your lab results and Wholefed factors your real biomarkers into every meal analysis.",
    pad: 8,
  },
  {
    path: "/history",
    selector: "main",
    title: "Your Scans, Saved",
    body: "Every meal you scan appears here automatically so you can look back at what you have been eating over time.",
    pad: 0,
  },
  {
    path: "/",
    selector: '[data-onboarding="sample-meal"]',
    title: "See It In Action",
    body: "Let's try a sample meal so you can see exactly what a top-tier analysis looks like.",
    pad: 12,
    ctaText: "Scan sample meal",
    ctaAction: "trySample",
  },
  {
    path: "/results",
    selector: '[data-onboarding="score-ring"]',
    title: "Your Meal Score",
    body: "Overall health score for this meal. Built from macro completeness, processing level, and what's missing.",
    pad: 12,
  },
  {
    path: "/results",
    selector: '[data-onboarding="bars"]',
    title: "Variety & Nutrition",
    body: "Two sub-scores: variety is how many distinct food groups are present, nutrition is the overall density. Both feed the main score.",
    pad: 8,
  },
  {
    path: "/results",
    selector: '[data-onboarding="insights"]',
    title: "The Full Breakdown",
    body: "Detected ingredients, what's missing, food interactions, and a personalized note tied to your conditions. This is what makes Wholefed different from a calorie counter.",
    pad: 8,
    scrollBlock: "start",
  },
  {
    path: "/",
    selector: '[data-onboarding="shutter"]',
    title: "Ready When You Are",
    body: "That is the full flow. Whenever you want to scan your own meal, tap this shutter. No pressure to do it right now.",
    pad: 16,
    final: true,
    ctaText: "Got it",
  },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("wholefed_onboarding_done") === "true";
    if (done) return;
    const t = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const current = active ? STEPS[step] : null;

  // Measure target; KEEP last known rect if target isn't found yet so the
  // spotlight does not disappear during route transitions (eliminates flicker).
  const measure = useCallback(() => {
    if (!current) return;
    if (current.path !== pathname) return;
    const el = document.querySelector(current.selector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    setRect((prev) => {
      const next = { top: r.top, left: r.left, width: r.width, height: r.height };
      if (
        prev &&
        Math.abs(prev.top - next.top) < 0.5 &&
        Math.abs(prev.left - next.left) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5
      ) {
        return prev;
      }
      return next;
    });
  }, [current, pathname]);

  // Scroll-then-show: each time the step or path changes, hide the overlay,
  // scroll the target into view, wait for the scroll to settle, THEN measure
  // and reveal the spotlight + tooltip in their final positions. Avoids the
  // "popup floats off after scroll" bug.
  useEffect(() => {
    if (!active || !current) return;
    if (current.path !== pathname) {
      setReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    const sequence = async () => {
      // small grace period for the DOM to settle after route transitions
      await new Promise((r) => setTimeout(r, 80));
      if (cancelled) return;
      const el = document.querySelector(current.selector);
      if (!el) {
        // poll for the target appearing (e.g. /results still loading)
        for (let i = 0; i < 40 && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 100));
          const e2 = document.querySelector(current.selector);
          if (e2) break;
        }
      }
      const target = document.querySelector(current.selector);
      if (!target || cancelled) return;
      const r = target.getBoundingClientRect();
      const vh = window.innerHeight;
      const offscreen = r.top < 80 || r.bottom > vh - 260;
      if (offscreen) {
        target.scrollIntoView({ behavior: "smooth", block: current.scrollBlock || "center" });
        await new Promise((r) => setTimeout(r, 520));
      }
      if (cancelled) return;
      measure();
      // brief settle so the spotlight ring's CSS transition does not
      // overlap with the layout finishing
      await new Promise((r) => setTimeout(r, 60));
      if (!cancelled) setReady(true);
    };
    sequence();
    return () => {
      cancelled = true;
    };
  }, [active, step, pathname, current, measure]);

  // Lightweight tracking only — keep rect updated on resize. We deliberately
  // do NOT re-measure on scroll while ready=true, because scroll is locked
  // and re-measuring during programmatic scroll causes the popup to drift.
  useEffect(() => {
    if (!active) return;
    const onResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, measure]);

  // Lock user-initiated scrolling while onboarding is active so the tooltip
  // and spotlight never drift out of place. Programmatic scrollIntoView (used
  // above to move between sections) is unaffected.
  useEffect(() => {
    if (!active) return;
    const prevent = (e) => {
      // Allow scroll/touch inside the tooltip card itself
      if (e.target.closest?.("[data-onboarding-card]")) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    document.addEventListener("wheel", prevent, { passive: false });
    return () => {
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("wheel", prevent);
    };
  }, [active]);

  if (!active || !current) return null;
  if (!rect) return null;

  // Hide overlay until we've scrolled the target into view AND measured
  // the final rect. This is the fix for the popup drifting after auto-scroll.
  const pathReady = current.path === pathname && ready;

  const finish = () => {
    localStorage.setItem("wholefed_onboarding_done", "true");
    setActive(false);
  };

  const handleNext = () => {
    if (current.ctaAction === "trySample") {
      setStep(step + 1);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("wholefed:trySample"));
      }, 80);
      return;
    }
    if (current.final) {
      finish();
      return;
    }
    const nextIndex = step + 1;
    const nextStep = STEPS[nextIndex];
    setStep(nextIndex);
    if (nextStep.path !== pathname) {
      router.push(nextStep.path);
    }
  };

  const handleSkip = () => finish();

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const pad = current.pad || 0;
  const cutoutTop = Math.max(0, rect.top - pad);
  const cutoutLeft = Math.max(0, rect.left - pad);
  const cutoutWidth = rect.width + pad * 2;
  const cutoutHeight = rect.height + pad * 2;
  const cutoutRadius = 16;

  // Popup goes in the half of the viewport opposite to where the spotlight
  // is. Stays at a fixed top/bottom anchor so it never drifts and never gets
  // squeezed off-screen by a tall target.
  const spotlightCenter = cutoutTop + Math.min(cutoutHeight, vh) / 2;
  const popupAtBottom = spotlightCenter < vh / 2;

  return (
    <div
      className="fixed inset-0 z-[55] pointer-events-auto"
      onClick={(e) => {
        // Block all taps on the underlying app except those that hit the
        // tooltip card. This locks the user to onboarding controls only.
        if (!e.target.closest?.("[data-onboarding-card]")) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      style={{
        opacity: pathReady ? 1 : 0,
        transition: "opacity 220ms ease",
      }}
    >
      {/* Spotlight ring with box-shadow trick. pointer-events: none so
          taps and scroll pass through to the underlying app. The tooltip
          card below captures clicks for the Got it / Skip buttons. */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: cutoutTop,
          left: cutoutLeft,
          width: cutoutWidth,
          height: cutoutHeight,
          borderRadius: `${cutoutRadius}px`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px rgba(188,204,171,0.55), 0 0 24px 4px rgba(188,204,171,0.25)",
          transition: "top 360ms cubic-bezier(0.4, 0, 0.2, 1), left 360ms cubic-bezier(0.4, 0, 0.2, 1), width 360ms cubic-bezier(0.4, 0, 0.2, 1), height 360ms cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "wholefedPulse 1.6s ease-in-out infinite",
        }}
      />

      {/* Tooltip card — anchored to top or bottom of viewport, opposite the
          spotlight. Never drifts because position is fixed to viewport edges,
          not relative to the target. */}
      <div
        className="fixed pointer-events-auto"
        style={{
          top: popupAtBottom ? "auto" : "calc(env(safe-area-inset-top) + 80px)",
          bottom: popupAtBottom ? "calc(env(safe-area-inset-bottom) + 110px)" : "auto",
          left: 16,
          right: 16,
          transition: "opacity 220ms ease",
        }}
      >
        <div data-onboarding-card className="bg-[#1c2623]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-2xl mx-auto" style={{ maxWidth: 360 }}>
          <h3 className="text-[16px] font-light text-[#e5e2e1] tracking-wide">{current.title}</h3>
          <p className="text-[13px] font-light text-[#acabaa] leading-relaxed">{current.body}</p>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === step ? "14px" : "5px",
                    height: "5px",
                    backgroundColor: i === step ? "#bcccab" : "rgba(255,255,255,0.18)",
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-[#6b7a5e] text-white text-[12px] font-medium tracking-wide active:scale-95 transition-transform"
            >
              {current.ctaText || "Got it"}
            </button>
          </div>
        </div>
        {!current.final && (
          <button
            onClick={handleSkip}
            className="block mx-auto mt-3 text-[11px] font-light text-[#8a8578]/60 py-1"
          >
            Skip tour
          </button>
        )}
      </div>

      <style jsx global>{`
        @keyframes wholefedPulse {
          0%, 100% {
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px rgba(188,204,171,0.55), 0 0 24px 4px rgba(188,204,171,0.25);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 3px rgba(188,204,171,0.85), 0 0 32px 8px rgba(188,204,171,0.45);
          }
        }
      `}</style>
    </div>
  );
}
