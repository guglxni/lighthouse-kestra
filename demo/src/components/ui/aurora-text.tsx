"use client";

import { memo } from "react";

interface AuroraTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

export const AuroraText = memo(function AuroraText({
  children,
  className = "",
  colors = ["#7dd3fc", "#a78bfa", "#fbbf24", "#38bdf8"],
  speed = 1,
}: AuroraTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text" as const,
    color: "transparent",
    animationDuration: `${10 / speed}s`,
  };

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="sr-only">{children}</span>
      <span className="animate-aurora bg-clip-text text-transparent" style={gradientStyle} aria-hidden="true">
        {children}
      </span>
    </span>
  );
});
