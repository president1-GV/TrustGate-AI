import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-500/15 text-slate-300 border-slate-500/30",
        low:
          "bg-risk-low/15 text-risk-low border-risk-low/30",
        medium:
          "bg-risk-medium/15 text-risk-medium border-risk-medium/30",
        high:
          "bg-risk-high/15 text-risk-high border-risk-high/30",
        critical:
          "bg-rose-500/15 text-rose-400 border-rose-500/30",
        pass:
          "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        warning:
          "bg-amber-500/15 text-amber-400 border-amber-500/30",
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
