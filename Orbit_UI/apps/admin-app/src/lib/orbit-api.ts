import {
  createApiClient,
  createAuthApi,
  isAdminRole,
  type ApiUser,
} from "@orbit/api";

export { ApiError, getApiErrorMessage, type ApiUser } from "@orbit/api";
export { isAdminRole };

const api = createApiClient({ defaultPort: "3004" });

export const authApi = createAuthApi("admin", api);
