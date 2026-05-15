"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

/**
 * FluidGlass — a soft, refractive "frosted glass" card.
 * Inspired by React Bits' Fluid Glass, but CSS-only (no WebGL): backdrop-blur,
 * inner highlight gradient, subtle noise overlay, and a hovering specular blob.
 */
export function FluidGlass({
  children,
  className,
  highlight = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] shadow-[0_30px_90px_-30px_rgba(2,6,23,0.9)] backdrop-blur-2xl",
        className,
      )}
      {...props}
    >
      {/* top inner highlight */}
      {highlight ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
          }}
          aria-hidden
        />
      ) : null}
      {/* refraction blob */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-40 blur-3xl mix-blend-screen animate-float"
        style={{ background: "radial-gradient(closest-side, rgba(125,211,252,0.45), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-30 blur-3xl mix-blend-screen animate-float"
        style={{ background: "radial-gradient(closest-side, rgba(167,139,250,0.45), transparent 70%)", animationDelay: "1.5s" }}
        aria-hidden
      />
      {/* noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}
