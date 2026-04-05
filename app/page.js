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

  useEffect(() => {
    setRemaining(scansRemaining());
    setPro(isPro());
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

  const tryScan = () => {
    if (!canScan()) {
      router.push("/subscribe");
      return false;
    }
    incrementScanCount();
    setRemaining(scansRemaining());
    return true;
  };

  // Native camera via Capacitor
  const handleNativeCamera = async () => {
    if (!tryScan()) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1200,
        height: 1200,
      });
      const base64 = photo.dataUrl;
      await storeAndNavigate(base64, base64);
    } catch (err) {
      console.warn("Camera error:", err);
    }
  };

  // Native photo picker via Capacitor
  const handleNativeGallery = async () => {
    if (!tryScan()) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 1200,
        height: 1200,
      });
      const base64 = photo.dataUrl;
      await storeAndNavigate(base64, base64);
    } catch (err) {
      console.warn("Gallery error:", err);
    }
  };

  const triggerHaptic = async () => {
    try {
      if (isNative()) {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch {}
  };

  const handleShutter = () => {
    triggerHaptic();
    if (isNative()) {
      handleNativeCamera();
      return;
    }
    // Web fallback — use file input with camera capture
    if (fileRef.current) {
      fileRef.current.setAttribute("capture", "environment");
      fileRef.current.click();
    }
  };

  const handleGallery = () => {
    if (isNative()) {
      handleNativeGallery();
      return;
    }
    // Web fallback — file picker
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
    await storeAndNavigate(url, base64);
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

      {/* Top App Bar — frosted glass, edge to edge */}
      <header className="absolute top-0 left-0 w-full z-50 flex items-end justify-center pt-16 pb-3 bg-white/[0.04] backdrop-blur-2xl border-b border-white/[0.06]">
        <h1 className="text-[#d4cfc4] font-thin tracking-[0.3em] text-sm uppercase drop-shadow-sm">
          WHOLEFED
        </h1>
      </header>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 w-full z-10 flex flex-col items-center pb-28 pt-16" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }}>
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
