import { PageHeader, PageBody } from "@/components/page-shell";
import { ConversationsGrid } from "@/components/conversations-grid";
import { RequirePermission } from "@/components/auth-guard";
import { getConversations } from "@/lib/data";

export default function ConversationsPage() {
  const conversations = getConversations();

  return (
    <RequirePermission permission="conversations.view">
      <PageHeader
        title="Conversations"
        description="Chat sessions initiated by registered users."
      />
      <PageBody>
        <ConversationsGrid conversations={conversations} />
      </PageBody>
    </RequirePermission>
  );
}
