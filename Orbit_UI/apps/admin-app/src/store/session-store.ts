import { createOperatorSessionStore, type OperatorSessionUser } from "@orbit/auth";

export type AdminSessionUser = OperatorSessionUser;

export const useSessionStore = createOperatorSessionStore({ initialLoading: true });
