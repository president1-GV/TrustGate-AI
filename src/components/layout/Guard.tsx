import * as React from "react";
import { useAuthStore } from "@/providers/AuthProvider";
import { roleAtLeast, type AppRole } from "@/lib/insforge";
import { AccessDeniedPage } from "@/pages/AccessDeniedPage";

export interface GuardProps {
  children: React.ReactNode;
  role?: AppRole;
  fallback?: React.ReactNode;
  className?: string;
}

export function Guard({ children, role, fallback, className }: GuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!role) {
    return <div className={className}>{children}</div>;
  }

  if (!user || !roleAtLeast(user.role, role)) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return <AccessDeniedPage />;
  }

  return <div className={className}>{children}</div>;
}
