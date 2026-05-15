"use client";

import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#7dd3fc",
      shimmerSize = "0.08em",
      shimmerDuration = "2.5s",
      borderRadius = "16px",
      background = "linear-gradient(135deg, #0c1224 0%, #070b14 100%)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 inline-flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 font-semibold text-ink-50 [background:var(--bg)] [border-radius:var(--radius)]",
          "transform-gpu transition-transform duration-300 ease-out active:translate-y-px hover:-translate-y-0.5",
          className,
        )}
        {...props}
      >
        <div
          className="absolute inset-0 -z-30 overflow-visible blur-[2px]"
          style={{ containerType: "size" } as CSSProperties}
        >
          <div className="animate-shimmer-slide absolute inset-0 aspect-square h-[100cqh]">
            <div
              className="animate-spin-around absolute -inset-[100%] w-auto rotate-0"
              style={{
                background:
                  "conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, var(--shimmer-color) var(--spread), transparent var(--spread))",
              }}
            />
          </div>
        </div>
        {children}
        <div
          className="absolute inset-0 size-full rounded-[inherit] px-4 py-1.5 shadow-[inset_0_-8px_10px_#ffffff1f] transition-all duration-300 ease-in-out group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]"
          aria-hidden
        />
        <div
          className="absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)]"
          style={{ inset: "var(--cut)" }}
          aria-hidden
        />
      </button>
    );
  },
);
ShimmerButton.displayName = "ShimmerButton";
