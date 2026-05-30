import { create } from "zustand";

export interface AdminSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SessionState {
  user: AdminSessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authGraceUntil: number;
  setUser: (user: AdminSessionUser | null) => void;
  setLoading: (loading: boolean) => void;
  markAuthGrace: (ms?: number) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authGraceUntil: 0,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  markAuthGrace: (ms = 3000) => set({ authGraceUntil: Date.now() + ms }),
  logout: () => set({ user: null, isAuthenticated: false, authGraceUntil: 0 }),
}));
