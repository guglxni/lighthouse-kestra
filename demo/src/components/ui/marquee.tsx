"use client";

import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";

export function Marquee({
  children,
  className,
  pauseOnHover = true,
  duration = "40s",
  gap = "2rem",
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  duration?: string;
  gap?: string;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full overflow-hidden",
        "[mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]",
        className,
      )}
      style={{ "--duration": duration, "--gap": gap } as CSSProperties}
    >
      <div
        className={cn(
          "flex shrink-0 items-center animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          reverse && "[animation-direction:reverse]",
        )}
        style={{ gap }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
