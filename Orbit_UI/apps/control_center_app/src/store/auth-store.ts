import { createOperatorSessionStore, type OperatorSessionUser } from "@orbit/auth";

export type ControlUser = OperatorSessionUser;

export const useAuthStore = createOperatorSessionStore();
