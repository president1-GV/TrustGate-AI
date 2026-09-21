import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-ink-card text-slate-200 border border-ink-border hover:bg-ink-raised hover:border-slate-600/50",
        primary:
          "bg-signal-blue text-white shadow-glow hover:bg-signal-blue/90 hover:shadow-lg hover:shadow-signal-blue/25",
        destructive:
          "bg-risk-high/90 text-white hover:bg-risk-high border border-risk-high/40",
        ghost:
          "hover:bg-slate-800/60 text-slate-300 hover:text-white",
        secondary:
          "bg-slate-800/70 text-slate-200 border border-slate-700/60 hover:bg-slate-700/70",
        outline:
          "border border-ink-border bg-transparent text-slate-200 hover:bg-ink-card hover:border-slate-600/50",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
