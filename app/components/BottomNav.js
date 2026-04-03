"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { href: "/history", icon: "history", label: "History" },
  { href: "/", icon: "photo_camera", label: "Scan", filled: true },
  { href: "/profile", icon: "person", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-24 px-8 pt-2 pb-[env(safe-area-inset-bottom)] bg-black/40 backdrop-blur-2xl border-t border-white/[0.08]">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className={`flex flex-col items-center justify-center transition-all duration-300 ${
              active
                ? "text-[#6b7a5e] scale-110"
                : "text-[#8a8578] hover:text-[#d4cfc4]"
            }`}
          >
            <span
              className={active ? "material-symbols-outlined text-3xl mb-1" : "material-symbols-outlined text-2xl mb-1"}
              style={
                active && tab.filled
                  ? { fontVariationSettings: "'FILL' 1" }
                  : { fontVariationSettings: "'FILL' 0, 'wght' 200" }
              }
            >
              {tab.icon}
            </span>
            <span className={`text-[9px] tracking-[0.2em] uppercase ${active ? "font-bold" : "font-medium"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
