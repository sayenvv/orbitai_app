import { create } from "zustand";

export type OperatorSessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type OperatorSessionState = {
  user: OperatorSessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authGraceUntil: number;
  setUser: (user: OperatorSessionUser | null) => void;
  setLoading: (loading: boolean) => void;
  markAuthGrace: (ms?: number) => void;
  logout: () => void;
};

type CreateOperatorSessionStoreOptions = {
  initialLoading?: boolean;
};

export function createOperatorSessionStore(options: CreateOperatorSessionStoreOptions = {}) {
  return create<OperatorSessionState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: options.initialLoading ?? false,
    authGraceUntil: 0,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setLoading: (isLoading) => set({ isLoading }),
    markAuthGrace: (ms = 3000) => set({ authGraceUntil: Date.now() + ms }),
    logout: () => set({ user: null, isAuthenticated: false, authGraceUntil: 0 }),
  }));
}
