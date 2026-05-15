"use client";

import { memo } from "react";
import { AnimatePresence, motion, type Variants, type MotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimationType = "text" | "word" | "character" | "line";
type AnimationVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "slideUp"
  | "slideDown"
  | "scaleUp";

const staggerTimings: Record<AnimationType, number> = {
  text: 0.06,
  word: 0.05,
  character: 0.03,
  line: 0.06,
};

const containerBase: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { delayChildren: 0, staggerChildren: 0.05 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};

const itemVariants: Record<AnimationVariant, Variants> = {
  fadeIn: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.3 } },
  },
  blurIn: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    show: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.3 } },
    exit: { opacity: 0, filter: "blur(10px)", transition: { duration: 0.3 } },
  },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
    show: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { y: { duration: 0.3 }, opacity: { duration: 0.4 }, filter: { duration: 0.3 } },
    },
    exit: { opacity: 0, filter: "blur(10px)", y: 20, transition: { duration: 0.3 } },
  },
  slideUp: {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.3 } },
  },
  slideDown: {
    hidden: { y: -20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
    exit: { y: 20, opacity: 0, transition: { duration: 0.3 } },
  },
  scaleUp: {
    hidden: { scale: 0.5, opacity: 0 },
    show: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.3, scale: { type: "spring", damping: 15, stiffness: 300 } },
    },
    exit: { scale: 0.5, opacity: 0, transition: { duration: 0.3 } },
  },
};

interface TextAnimateProps extends Omit<MotionProps, "children"> {
  children: string;
  className?: string;
  segmentClassName?: string;
  delay?: number;
  duration?: number;
  as?: "div" | "p" | "span" | "h1" | "h2" | "h3" | "h4";
  by?: AnimationType;
  once?: boolean;
  startOnView?: boolean;
  animation?: AnimationVariant;
}

const TextAnimateBase = ({
  children,
  delay = 0,
  duration = 0.5,
  className,
  segmentClassName,
  as = "p",
  by = "word",
  once = true,
  startOnView = true,
  animation = "blurInUp",
  ...props
}: TextAnimateProps) => {
  const segments =
    by === "word"
      ? children.split(/(\s+)/)
      : by === "character"
        ? children.split("")
        : by === "line"
          ? children.split("\n")
          : [children];

  const container: Variants = {
    ...containerBase,
    show: {
      ...((containerBase.show as object) ?? {}),
      transition: {
        delayChildren: delay,
        staggerChildren: duration / Math.max(segments.length, 1),
      },
    },
  };
  const item = itemVariants[animation];
  const MotionTag = motion[as] as typeof motion.p;

  return (
    <AnimatePresence mode="popLayout">
      <MotionTag
        variants={container}
        initial="hidden"
        whileInView={startOnView ? "show" : undefined}
        animate={startOnView ? undefined : "show"}
        exit="exit"
        viewport={{ once }}
        className={cn("whitespace-pre-wrap", className)}
        aria-label={children}
        {...props}
      >
        {segments.map((segment, i) => (
          <motion.span
            key={`${by}-${i}`}
            variants={item}
            custom={i * staggerTimings[by]}
            aria-hidden
            className={cn(by === "line" ? "block" : "inline-block whitespace-pre", segmentClassName)}
          >
            {segment}
          </motion.span>
        ))}
      </MotionTag>
    </AnimatePresence>
  );
};

export const TextAnimate = memo(TextAnimateBase);
