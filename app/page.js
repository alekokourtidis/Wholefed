"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "./components/BottomNav";
import { canScan, scansRemaining, incrementScanCount, isPro } from "../lib/scans";

// Check if running inside Capacitor native shell
function isNative() {
  return typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
}

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [remaining, setRemaining] = useState(3);
  const [pro, setPro] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    setRemaining(scansRemaining());
    setPro(isPro());
  }, []);

  // Listen for scan tab tap from BottomNav (Apple reviewers tap the labeled
  // "Scan" tab in the nav rather than the unlabeled shutter circle).
  useEffect(() => {
    const onScan = () => handleShutter();
    window.addEventListener("wholefed:scan", onScan);
    return () => window.removeEventListener("wholefed:scan", onScan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compress image to max 1200px and JPEG quality 0.7 to fit in sessionStorage
  const compressBase64 = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 1200;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = src;
    });

  const toBase64FromFile = (file) => compressBase64(URL.createObjectURL(file));

  const storeAndNavigate = async (displayUrl, base64) => {
    try { sessionStorage.setItem("wholefed_image", displayUrl); } catch {}
    try { sessionStorage.setItem("wholefed_image_base64", base64); } catch {}
    window.__wholefed_base64 = base64;
    window.__wholefed_image = displayUrl;
    router.push("/results");
  };

  // Check whether the user is allowed to scan (does NOT consume a scan).
  // We only burn a scan after a photo is actually captured.
  const tryScan = () => {
    if (!canScan()) {
      router.push("/subscribe");
      return false;
    }
    return true;
  };

  const consumeScan = () => {
    incrementScanCount();
    setRemaining(scansRemaining());
  };

  const triggerHaptic = async () => {
    try {
      if (isNative()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch {}
  };

  // Use the standard HTML file input for camera on ALL platforms (native +
  // web). The Capacitor Camera plugin has proven unreliable across iOS
  // versions (fails silently on iOS 26, hangs on some devices). The HTML
  // <input type="file" accept="image/*" capture="environment"> always works
  // in WKWebView and opens the exact same system camera UI.
  const handleShutter = () => {
    triggerHaptic();
    setCameraError("");
    if (!tryScan()) return;
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "environment");
      fileRef.current.click();
    }
  };

  const handleGallery = () => {
    setCameraError("");
    if (!tryScan()) return;
    if (fileRef.current) {
      fileRef.current.removeAttribute("capture");
      fileRef.current.click();
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!tryScan()) return;
    const base64 = await toBase64FromFile(file);
    const url = URL.createObjectURL(file);
    consumeScan();
    await storeAndNavigate(url, base64);
  };

  // Demo flow — uses a built-in sample meal so the full scan→results flow
  // can be tested without a real camera (works on simulators and for App
  // Store reviewers who don't have food in front of them).
  const handleSampleScan = async () => {
    triggerHaptic();
    if (!tryScan()) return;
    try {
      const res = await fetch("/healthymeal1.jpg");
      if (!res.ok) throw new Error("Sample image not found");
      const blob = await res.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const compressed = await compressBase64(base64);
      consumeScan();
      await storeAndNavigate(compressed, compressed);
    } catch (err) {
      console.warn("Sample scan error:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Camera viewfinder area — pure black until the native camera opens */}
      <div className="absolute inset-0">
        {/* Corner bracket focus frame — sized to fit the available area */}
        <div className="absolute inset-0 flex items-center justify-center pt-32 pb-48">
          <div className="relative w-[min(94vw,546px)] h-[min(60vh,560px)] drop-shadow-[0_0_12px_rgba(188,204,171,0.3)]">
            <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-[#bcccab]/30 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-14 h-14 border-t-2 border-r-2 border-[#bcccab]/30 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-14 h-14 border-b-2 border-l-2 border-[#bcccab]/30 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-[#bcccab]/30 rounded-br-2xl" />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Top App Bar — frosted glass, edge to edge */}
      <header className="absolute top-0 left-0 w-full z-50 flex items-end justify-center pt-16 pb-3 bg-white/[0.04] backdrop-blur-2xl border-b border-white/[0.06]">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase drop-shadow-sm">
          WHOLEFED
        </h1>
      </header>

      {/* "Try with a sample meal" — visible while free scans remain so new
          users (and App Store reviewers) can test the flow without real food.
          Disappears once all 3 free scans are used. */}
      {remaining > 0 && !pro && (
        <div className="absolute top-28 left-0 w-full z-40 flex flex-col items-center px-6 gap-2">
          <button
            onClick={handleSampleScan}
            className="px-5 py-2.5 rounded-full bg-[#bcccab] text-[#131313] text-[11px] tracking-[0.2em] uppercase font-semibold shadow-lg active:scale-95 transition-transform"
          >
            Try with a sample meal
          </button>
          {cameraError && (
            <p className="max-w-xs text-center text-[11px] text-red-300/90 bg-black/40 backdrop-blur-md rounded-lg px-3 py-2">
              {cameraError}
            </p>
          )}
        </div>
      )}

      {/* Bottom controls — sit just above BottomNav */}
      <div
        className="absolute bottom-0 left-0 w-full z-10 flex flex-col items-center pt-8"
        style={{
          // BottomNav is 5rem tall (+ safe-area). Add 1.5rem of breathing
          // room so the shutter button is never tucked under the nav on
          // iPad (which has no home-indicator safe area).
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6.5rem)",
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
        }}
      >
        {/* Scan counter */}
        {!pro && remaining <= 0 && (
          <button
            onClick={() => router.push("/subscribe")}
            className="text-[10px] tracking-[0.2em] uppercase text-[#bcccab] mb-4"
          >
            Get unlimited scans
          </button>
        )}
        <div className="flex items-center gap-10">
          <button
            onClick={handleGallery}
            className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base text-[#d4cfc4]" style={{ fontVariationSettings: "'wght' 300" }}>
              photo_library
            </span>
          </button>

          <button
            onClick={handleShutter}
            aria-label="Scan meal"
            className="flex flex-col items-center justify-center transition-transform active:scale-90 duration-200"
          >
            <div className="w-[68px] h-[68px] rounded-full border-[3px] border-[#d4cfc4] flex items-center justify-center">
              <div className="w-[56px] h-[56px] rounded-full bg-[#d4cfc4]/10 border border-[#d4cfc4]/30" />
            </div>
            <span className="mt-2 text-[9px] tracking-[0.25em] uppercase text-[#d4cfc4]/70">
              Tap to scan
            </span>
          </button>

          <div className="w-10 h-10" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
