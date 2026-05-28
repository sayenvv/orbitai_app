export type UserStatus = "active" | "trial" | "suspended" | "invited";
export type Plan = "free" | "starter" | "pro" | "enterprise";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  status: UserStatus;
  plan: Plan;
  country: string;
  registeredAt: string;
  lastActiveAt: string;
  totalConversations: number;
  totalSpend: number;
};

export type PaymentStatus = "succeeded" | "pending" | "refunded" | "failed";
export type PaymentMethod = "card" | "paypal" | "bank" | "apple_pay";

export type Payment = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  cardLast4?: string;
  description: string;
  createdAt: string;
};

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export type Subscription = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: Plan;
  status: SubscriptionStatus;
  mrr: number;
  startedAt: string;
  renewsAt: string;
  seats: number;
};

export type AdminConversation = {
  id: string;
  userId: string;
  userName: string;
  title: string;
  agent: string;
  messages: number;
  tokens: number;
  startedAt: string;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  type: "signup" | "login" | "payment" | "subscription" | "support" | "security";
  actor: string;
  message: string;
  timestamp: string;
};
