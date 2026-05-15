"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beam focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
  {
    variants: {
      variant: {
        default:
          "bg-beam text-ink-950 shadow-[0_18px_45px_rgba(56,189,248,0.35)] hover:-translate-y-0.5",
        secondary:
          "border border-white/15 bg-white/5 text-ink-100 hover:border-beam/40 hover:bg-white/10",
        ghost: "text-ink-200 hover:bg-white/5 hover:text-ink-50",
        outline:
          "border border-white/10 bg-transparent text-ink-100 hover:border-beam/40 hover:bg-white/5",
        link: "text-beam underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
