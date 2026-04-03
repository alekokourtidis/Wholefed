"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const defaultIngredients = [
  "Salmon",
  "White Rice",
  "Spinach",
  "Cheese",
  "Olive Oil",
];

export default function ConfirmPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState(defaultIngredients);

  const removeIngredient = (name) => {
    setIngredients(ingredients.filter((i) => i !== name));
  };

  const handleGetResults = () => {
    // TODO: send ingredients to API
    router.push("/results");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1a1a1a]">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-center items-center h-16 bg-transparent backdrop-blur-md">
        <h1 className="text-warm-white font-thin tracking-[0.3em] text-sm uppercase drop-shadow-sm">
          WHOLEFED
        </h1>
      </header>

      {/* Food Photo */}
      <section className="h-[55%] w-full relative overflow-hidden">
        <div className="w-full h-full bg-surface-container flex items-center justify-center">
          <span
            className="material-symbols-outlined text-5xl text-muted"
            style={{ fontVariationSettings: "'wght' 100" }}
          >
            restaurant
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent opacity-60" />
      </section>

      {/* Ingredient Confirmation */}
      <section className="flex-1 px-8 pt-8 pb-32 flex flex-col justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted mb-6">
            Anything missing?
          </p>
          <div className="flex flex-wrap gap-3 no-scrollbar overflow-x-auto">
            {ingredients.map((name) => (
              <div
                key={name}
                className="glass-pill px-5 py-2.5 rounded-full flex items-center space-x-2 border border-outline-variant/10"
              >
                <span className="text-on-surface-variant text-xs tracking-wider">
                  {name}
                </span>
                <button onClick={() => removeIngredient(name)}>
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant/50 hover:text-error transition-colors">
                    close
                  </span>
                </button>
              </div>
            ))}
            {/* Add manual button */}
            <button className="bg-primary-container/20 px-4 py-2.5 rounded-full flex items-center border border-primary-container/30 hover:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-[20px] text-primary">
                add
              </span>
            </button>
          </div>
        </div>

        {/* Get Results CTA */}
        <div className="mt-auto">
          <button
            onClick={handleGetResults}
            className="w-full h-16 rounded-2xl glass-pill flex items-center justify-center space-x-3 active:scale-95 transition-transform duration-200 border border-outline-variant/20"
          >
            <span className="text-warm-white text-sm tracking-[0.2em] uppercase font-semibold">
              Get Results
            </span>
            <span className="material-symbols-outlined text-warm-white">
              arrow_forward
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
