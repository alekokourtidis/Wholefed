"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";

// Strava-style shareable result card. Two variants:
//  - "bg": clean green-gradient card (full share image)
//  - "transparent": just the ring + bars on transparent background, for overlaying
//    in the corner of a meal photo / story.
export default function ShareCard({ score = 0, completeness = 0, quality = 0, title = "", onClose }) {
  const cardRef = useRef(null);
  const [variant, setVariant] = useState("bg"); // 'bg' | 'transparent'
  const [busy, setBusy] = useState(false);

  const isBg = variant === "bg";
  const C = Math.round(2 * Math.PI * 70); // ring circumference

  async function render() {
    const node = cardRef.current;
    if (!node) return null;
    return toPng(node, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: isBg ? undefined : "transparent",
      skipFonts: false,
    });
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await render();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `wholefed-${isBg ? "card" : "overlay"}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Wholefed score" });
      } else {
        // Fallback: download the PNG so it can be posted manually
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
      }
    } catch (e) {
      // user cancelled or share failed — silent
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm px-6">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        aria-label="Close"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Card preview (this is what gets exported) — checkerboard hint behind for transparent */}
      <div
        className="rounded-3xl"
        style={
          isBg
            ? {}
            : {
                backgroundImage:
                  "linear-gradient(45deg,#2a2a2a 25%,transparent 25%),linear-gradient(-45deg,#2a2a2a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2a2a 75%),linear-gradient(-45deg,transparent 75%,#2a2a2a 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
              }
        }
      >
        <div
          ref={cardRef}
          style={{
            width: 300,
            padding: isBg ? "30px 26px 26px" : "20px",
            borderRadius: 26,
            background: isBg
              ? "linear-gradient(165deg, #1f2c18 0%, #34492a 52%, #4a6b3a 100%)"
              : "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, alignSelf: "center" }}>
            <div
              style={{
                width: 22, height: 22, borderRadius: 6,
                background: "linear-gradient(135deg,#3d4b32,#8aab7f)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 13,
                textShadow: isBg ? "none" : "0 1px 3px rgba(0,0,0,0.5)",
              }}
            >W</div>
            <span style={{
              fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
              color: isBg ? "#dfe9d8" : "#ffffff",
              textShadow: isBg ? "none" : "0 1px 4px rgba(0,0,0,0.55)",
            }}>Wholefed</span>
          </div>

          {/* Score ring */}
          <div style={{ position: "relative", width: 150, height: 150 }}>
            <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="75" cy="75" r="70" fill="none" stroke={isBg ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.22)"} strokeWidth="7" />
              <circle
                cx="75" cy="75" r="70" fill="none" strokeWidth="7" strokeLinecap="round"
                stroke="url(#shareGrad)"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - Math.max(0, Math.min(100, score)) / 100)}
              />
              <defs>
                <linearGradient id="shareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a8c49e" />
                  <stop offset="55%" stopColor="#6b8a5e" />
                  <stop offset="100%" stopColor="#3d5a2d" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontSize: 46, fontWeight: 300, lineHeight: 1, color: isBg ? "#eef3ea" : "#ffffff",
                letterSpacing: "-0.03em",
                textShadow: isBg ? "none" : "0 2px 8px rgba(0,0,0,0.55)",
              }}>{score}</span>
              <span style={{
                fontSize: 8, letterSpacing: "0.28em", textTransform: "uppercase", marginTop: 5,
                color: isBg ? "#9db38f" : "#ffffff",
                textShadow: isBg ? "none" : "0 1px 4px rgba(0,0,0,0.55)",
              }}>Total Score</span>
            </div>
          </div>

          {/* Bars */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Completeness", value: completeness },
              { label: "Quality", value: quality },
            ].map((b) => (
              <div key={b.label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700,
                    color: isBg ? "#acbf9f" : "#ffffff",
                    textShadow: isBg ? "none" : "0 1px 4px rgba(0,0,0,0.6)",
                  }}>{b.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 300,
                    color: isBg ? "#dfe9d8" : "#ffffff",
                    textShadow: isBg ? "none" : "0 1px 4px rgba(0,0,0,0.6)",
                  }}>{Math.round(b.value)}/10</span>
                </div>
                <div style={{ height: 5, width: "100%", borderRadius: 99, background: isBg ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: `${Math.max(0, Math.min(10, b.value)) * 10}%`,
                    background: "linear-gradient(90deg,#3d4b32 0%,#6b7a5e 50%,#8aab7f 100%)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Variant toggle */}
      <div style={{ display: "flex", gap: 6, marginTop: 22, background: "rgba(255,255,255,0.08)", padding: 4, borderRadius: 999 }}>
        {[
          { k: "bg", label: "Background" },
          { k: "transparent", label: "Transparent" },
        ].map((o) => (
          <button
            key={o.k}
            onClick={() => setVariant(o.k)}
            style={{
              fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 999,
              color: variant === o.k ? "#14160e" : "#cfd6c6",
              background: variant === o.k ? "#a9c99e" : "transparent",
              transition: "0.15s",
            }}
          >{o.label}</button>
        ))}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={busy}
        className="mt-4 flex items-center gap-2 px-7 py-3 rounded-full font-semibold text-[15px]"
        style={{ background: "#a9c99e", color: "#14160e", opacity: busy ? 0.6 : 1 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
        {busy ? "Preparing…" : "Share"}
      </button>
    </div>
  );
}
