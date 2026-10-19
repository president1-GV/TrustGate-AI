import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-500/30",
        low:
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
        medium:
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
        high:
          "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40",
        critical:
          "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40",
        pass:
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
        warning:
          "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
