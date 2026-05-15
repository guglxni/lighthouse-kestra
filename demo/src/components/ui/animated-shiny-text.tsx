import type { ComponentPropsWithoutRef, CSSProperties, FC } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      style={{ "--shiny-width": `${shimmerWidth}px` } as CSSProperties}
      className={cn(
        "inline-block text-ink-300/80",
        "animate-shiny-text bg-clip-text bg-no-repeat",
        "bg-gradient-to-r from-transparent via-white/90 via-50% to-transparent",
        className,
      )}
    >
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundSize: "var(--shiny-width) 100%",
          backgroundPosition: "0 0",
        }}
      >
        {children}
      </span>
    </span>
  );
};
