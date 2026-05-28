import users from "@/data/users.json";
import payments from "@/data/payments.json";
import subscriptions from "@/data/subscriptions.json";
import conversations from "@/data/conversations.json";
import activity from "@/data/activity.json";
import type {
  AdminUser,
  Payment,
  Subscription,
  AdminConversation,
  ActivityEvent,
} from "@/types";

/**
 * Data access layer for the admin app.
 * Returns mock JSON data today; swap to real APIs by replacing these helpers.
 */
export function getUsers(): AdminUser[] {
  return users as AdminUser[];
}

export function getUser(id: string): AdminUser | undefined {
  return (users as AdminUser[]).find((u) => u.id === id);
}

export function getPayments(): Payment[] {
  return payments as Payment[];
}

export function getPaymentsForUser(userId: string): Payment[] {
  return (payments as Payment[]).filter((p) => p.userId === userId);
}

export function getSubscriptions(): Subscription[] {
  return subscriptions as Subscription[];
}

export function getConversations(): AdminConversation[] {
  return conversations as AdminConversation[];
}

export function getActivity(): ActivityEvent[] {
  return activity as ActivityEvent[];
}

export function getDashboardMetrics() {
  const u = getUsers();
  const p = getPayments();
  const s = getSubscriptions();
  const c = getConversations();

  const activeUsers = u.filter((x) => x.status === "active").length;
  const mrr = s
    .filter((x) => x.status === "active" || x.status === "trialing")
    .reduce((sum, x) => sum + x.mrr, 0);
  const revenue = p
    .filter((x) => x.status === "succeeded")
    .reduce((sum, x) => sum + x.amount, 0);
  const conversationsTotal = c.reduce((sum, x) => sum + x.messages, 0);

  return {
    totalUsers: u.length,
    activeUsers,
    mrr,
    revenue,
    payments: p.length,
    subscriptions: s.filter((x) => x.status === "active").length,
    conversations: c.length,
    messages: conversationsTotal,
  };
}
