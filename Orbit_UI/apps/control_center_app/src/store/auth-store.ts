import { create } from "zustand";

export interface ControlUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: ControlUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authGraceUntil: number;
  setUser: (user: ControlUser | null) => void;
  setLoading: (loading: boolean) => void;
  markAuthGrace: (ms?: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authGraceUntil: 0,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),
  markAuthGrace: (ms = 3000) => set({ authGraceUntil: Date.now() + ms }),
  logout: () => set({ user: null, isAuthenticated: false, authGraceUntil: 0 }),
}));
