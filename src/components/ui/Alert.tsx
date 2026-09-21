import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      severity: {
        default:
          "bg-ink-card/60 border-ink-border text-slate-200",
        info:
          "bg-signal-blue/10 border-signal-blue/30 text-signal-blue",
        success:
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        warning:
          "bg-amber-500/10 border-amber-500/30 text-amber-400",
        destructive:
          "bg-rose-500/10 border-rose-500/30 text-rose-400",
      },
    },
    defaultVariants: {
      severity: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Alias for `severity` — accepted for backwards compatibility */
  variant?: "default" | "info" | "success" | "warning" | "destructive";
}

function Alert({ className, severity, variant, ...props }: AlertProps) {
  // `variant` is an alias for `severity`; `severity` takes precedence if both supplied
  const resolvedSeverity = severity ?? variant ?? "default";
  return (
    <div
      role="alert"
      className={cn(alertVariants({ severity: resolvedSeverity }), className)}
      {...props}
    />
  );
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <h5
      className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
