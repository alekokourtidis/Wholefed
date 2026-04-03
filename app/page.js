"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "./components/BottomNav";
import { canScan, scansRemaining, incrementScanCount, isPro } from "../lib/scans";

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [remaining, setRemaining] = useState(3);
  const [pro, setPro] = useState(false);

  useEffect(() => {
    setRemaining(scansRemaining());
    setPro(isPro());
  }, []);

  const toBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const tryScan = () => {
    if (!canScan()) {
      router.push("/subscribe");
      return false;
    }
    incrementScanCount();
    setRemaining(scansRemaining());
    return true;
  };

  const handleShutter = () => {
    if (!tryScan()) return;
    sessionStorage.setItem("wholefed_image", "/healthymeal1.jpg");
    sessionStorage.setItem("wholefed_image_base64", "");
    router.push("/results");
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!tryScan()) return;
    const base64 = await toBase64(file);
    const url = URL.createObjectURL(file);
    sessionStorage.setItem("wholefed_image", url);
    sessionStorage.setItem("wholefed_image_base64", base64);
    router.push("/results");
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Full-screen camera area */}
      <div className="absolute inset-0">
        <img
          src="/healthymeal1.jpg"
          alt="Food"
          className="w-full h-full object-cover opacity-80"
        />
        {/* Corner bracket focus frame */}
        <div className="absolute inset-0 flex items-center justify-center -translate-y-16">
          <div className="w-72 h-96 relative drop-shadow-[0_0_12px_rgba(188,204,171,0.3)]">
            <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-[#bcccab]/50 rounded-tl-2xl shadow-[0_0_8px_rgba(188,204,171,0.3)]" />
            <div className="absolute top-0 right-0 w-14 h-14 border-t-2 border-r-2 border-[#bcccab]/50 rounded-tr-2xl shadow-[0_0_8px_rgba(188,204,171,0.3)]" />
            <div className="absolute bottom-0 left-0 w-14 h-14 border-b-2 border-l-2 border-[#bcccab]/50 rounded-bl-2xl shadow-[0_0_8px_rgba(188,204,171,0.3)]" />
            <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-[#bcccab]/50 rounded-br-2xl shadow-[0_0_8px_rgba(188,204,171,0.3)]" />
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

      {/* Top App Bar — frosted glass */}
      <header className="absolute top-0 left-0 w-full z-50 flex items-end justify-center h-26 pb-3 bg-black/25 backdrop-blur-2xl border-b border-white/[0.06]">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase drop-shadow-sm">
          WHOLEFED
        </h1>
      </header>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 w-full z-10 flex flex-col items-center pb-28 pt-16" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }}>
        {/* Scan counter */}
        {!pro && (
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#8a8578] mb-4">
            {remaining > 0 ? `${remaining} free scan${remaining !== 1 ? "s" : ""} left` : "No free scans left"}
          </p>
        )}
        <div className="flex items-center gap-10">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/[0.12] flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base text-[#d4cfc4]" style={{ fontVariationSettings: "'wght' 300" }}>
              photo_library
            </span>
          </button>

          <button
            onClick={handleShutter}
            className="w-[68px] h-[68px] rounded-full border-[3px] border-[#d4cfc4] flex items-center justify-center transition-transform active:scale-90 duration-200"
          >
            <div className="w-[56px] h-[56px] rounded-full border border-[#d4cfc4]/20" />
          </button>

          <div className="w-10 h-10" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
