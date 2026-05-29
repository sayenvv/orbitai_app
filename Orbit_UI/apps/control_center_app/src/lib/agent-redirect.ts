import { redirect } from "next/navigation";
import { fetchDefaultAgentId } from "@/lib/control-api-server";

/** Redirect `/section` → `/section/{firstAgentId}` using the control API. */
export async function redirectToDefaultAgent(section: string) {
  const agentId = await fetchDefaultAgentId();
  if (!agentId) {
    redirect("/agents");
  }
  redirect(`/${section}/${agentId}`);
}
