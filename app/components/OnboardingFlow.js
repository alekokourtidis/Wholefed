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
    body: "Let's try a sample meal so you can see the full analysis flow before you scan your own.",
    pad: 12,
    ctaText: "Scan sample meal",
    ctaAction: "trySample",
  },
  {
    path: "/results",
    selector: '[data-onboarding="score-ring"]',
    title: "Your Meal Score",
    body: "This is your overall health score for the meal. Scroll down to see insights, missing nutrients, and food interactions.",
    pad: 12,
  },
  {
    path: "/",
    selector: '[data-onboarding="shutter"]',
    title: "Now Try Your Own",
    body: "You're all set. Tap the shutter to scan a meal in front of you right now.",
    pad: 16,
    final: true,
    ctaText: "Open camera",
    ctaAction: "triggerShutter",
  },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem("wholefed_onboarding_done") === "true";
    if (done) return;
    const t = setTimeout(() => setActive(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const current = active ? STEPS[step] : null;

  const measure = useCallback(() => {
    if (!current) return;
    if (current.path !== pathname) {
      setVisible(false);
      setRect(null);
      return;
    }
    const el = document.querySelector(current.selector);
    if (!el) {
      setVisible(false);
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      setVisible(false);
      setRect(null);
      return;
    }
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

  useEffect(() => {
    if (!active) return;
    measure();
    const onChange = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    const interval = setInterval(measure, 200);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
      clearInterval(interval);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, step, pathname, measure]);

  // Fade-in once the rect is known
  useEffect(() => {
    if (rect) {
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [rect]);

  if (!active || !current) return null;
  if (current.path !== pathname) return null;
  if (!rect) return null;

  const finish = () => {
    localStorage.setItem("wholefed_onboarding_done", "true");
    setActive(false);
  };

  const handleNext = () => {
    if (current.ctaAction === "trySample") {
      // Advance step now so we are ready for /results, then fire scan
      setVisible(false);
      setRect(null);
      setStep(step + 1);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("wholefed:trySample"));
      }, 120);
      return;
    }
    if (current.ctaAction === "triggerShutter") {
      finish();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("wholefed:scan"));
      }, 80);
      return;
    }
    if (current.final) {
      finish();
      return;
    }
    const nextIndex = step + 1;
    const nextStep = STEPS[nextIndex];
    setVisible(false);
    setRect(null);
    // give the fade-out a beat before navigating
    setTimeout(() => {
      setStep(nextIndex);
      if (nextStep.path !== pathname) {
        router.push(nextStep.path);
      }
    }, 200);
  };

  const handleSkip = () => finish();

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const targetBottom = rect.top + rect.height;
  const spaceBelow = vh - targetBottom;
  const placeAbove = spaceBelow < 260;
  const tooltipMaxWidth = 320;
  const tooltipLeft = Math.max(
    16,
    Math.min(rect.left + rect.width / 2 - tooltipMaxWidth / 2, vw - tooltipMaxWidth - 16)
  );

  const pad = current.pad || 0;
  const cutoutTop = Math.max(0, rect.top - pad);
  const cutoutLeft = Math.max(0, rect.left - pad);
  const cutoutWidth = rect.width + pad * 2;
  const cutoutHeight = rect.height + pad * 2;
  const cutoutRadius = 16;

  return (
    <div
      className="fixed inset-0 z-[55] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 320ms ease",
      }}
    >
      {/* Dim everywhere except the cutout via giant box-shadow trick */}
      <div
        className="fixed pointer-events-auto"
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

      {/* Tooltip card */}
      <div
        className="fixed pointer-events-auto"
        style={{
          top: placeAbove ? "auto" : targetBottom + pad + 16,
          bottom: placeAbove ? vh - (rect.top - pad) + 16 : "auto",
          left: tooltipLeft,
          width: `${tooltipMaxWidth}px`,
          maxWidth: "calc(100vw - 32px)",
          transition: "top 360ms cubic-bezier(0.4, 0, 0.2, 1), bottom 360ms cubic-bezier(0.4, 0, 0.2, 1), left 360ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="bg-[#1c2623]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-3 shadow-2xl">
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
              {current.final || current.ctaText ? current.ctaText || "Done" : "Got it"}
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
