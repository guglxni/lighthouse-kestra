import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/5 text-ink-100",
        beam: "border-beam/30 bg-beam/10 text-beam-glow",
        iris: "border-violet-300/30 bg-iris/10 text-iris",
        flare: "border-amber-300/30 bg-flare/10 text-flare",
        emerald: "border-emerald-300/30 bg-emerald-400/10 text-emerald-300",
        outline: "border-white/10 bg-transparent text-ink-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
