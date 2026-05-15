"use client";

import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";

/**
 * FloatingHoverCard — a Floating UI hover card primitive.
 * Hover/focus the trigger to reveal the content with collision-aware placement.
 */
export function FloatingHoverCard({
  trigger,
  children,
  placement = "top",
  className,
}: {
  trigger: ReactElement;
  children: ReactNode;
  placement?: "top" | "right" | "bottom" | "left" | "top-start" | "top-end" | "bottom-start" | "bottom-end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip(), shift({ padding: 12 })],
  });
  const hover = useHover(context, { move: false, delay: { open: 80, close: 160 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<Record<string, unknown>>, {
        ref: refs.setReference,
        ...getReferenceProps(),
      })
    : trigger;

  return (
    <>
      {triggerNode}
      <FloatingPortal>
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              initial={{ opacity: 0, scale: 0.96, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`z-[80] w-[min(90vw,360px)] rounded-2xl border border-white/10 bg-ink-900/95 p-4 text-sm text-ink-200 shadow-lift backdrop-blur-xl ${className ?? ""}`}
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
}
