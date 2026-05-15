"use client";

import { cn } from "@/lib/utils";

/**
 * LiquidEther — a lightweight, CPU-friendly ambient background inspired by the
 * React Bits "Liquid Ether" WebGL background, implemented with CSS gradient
 * blobs + the `drift-*` keyframes. No canvas, no WebGL, no perf cost on idle.
 */
export function LiquidEther({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div
        className="absolute -top-32 -left-32 h-[42rem] w-[42rem] rounded-full opacity-[0.55] mix-blend-screen blur-3xl animate-drift-1"
        style={{
          background: "radial-gradient(closest-side, rgba(56,189,248,0.55), transparent 70%)",
          opacity: 0.55 * intensity,
        }}
      />
      <div
        className="absolute top-1/4 -right-40 h-[36rem] w-[36rem] rounded-full opacity-[0.5] mix-blend-screen blur-3xl animate-drift-2"
        style={{
          background: "radial-gradient(closest-side, rgba(167,139,250,0.55), transparent 70%)",
          opacity: 0.5 * intensity,
        }}
      />
      <div
        className="absolute -bottom-32 left-1/3 h-[34rem] w-[34rem] rounded-full opacity-[0.4] mix-blend-screen blur-3xl animate-drift-3"
        style={{
          background: "radial-gradient(closest-side, rgba(251,191,36,0.45), transparent 70%)",
          opacity: 0.4 * intensity,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(56,189,248,0.08) 0, transparent 40%), radial-gradient(circle at 80% 20%, rgba(167,139,250,0.08) 0, transparent 40%)",
        }}
      />
    </div>
  );
}
