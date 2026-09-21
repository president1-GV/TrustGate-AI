import * as React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  return (
    <span className={cn("relative inline-flex group", className)}>
      {children}
      <span
        className={cn(
          "pointer-events-none absolute z-50 scale-95 opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap rounded-md bg-ink-raised border border-ink-border px-2.5 py-1.5 text-xs text-slate-200 shadow-lg",
          side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
          side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
          side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
          side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2"
        )}
      >
        {content}
      </span>
    </span>
  );
}
