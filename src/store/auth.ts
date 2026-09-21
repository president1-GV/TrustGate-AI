import { create } from "zustand";
import type { AppRole } from "@/lib/insforge";

interface AuthState {
  loading: boolean;
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    role: AppRole;
    badgeId?: string;
    station?: string;
    team?: string;
    status?: "pending" | "approved" | "rejected";
    processId?: string;
  } | null;
  setLoading: (loading: boolean) => void;
  setSession: (user: AuthState["user"]) => void;
  clearSession: () => void;
  updateRole: (role: AppRole) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  isAuthenticated: false,
  user: null,
  setLoading: (loading) => set({ loading }),
  setSession: (user) => set({ user, isAuthenticated: true, loading: false }),
  clearSession: () => set({ user: null, isAuthenticated: false, loading: false }),
  updateRole: (role) =>
    set((s) => (s.user ? { user: { ...s.user, role } } : s)),
}));
