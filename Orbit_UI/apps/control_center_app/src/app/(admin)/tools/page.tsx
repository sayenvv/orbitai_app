import { redirectToDefaultAgent } from "@/lib/agent-redirect";

export default async function ToolsIndex() {
  await redirectToDefaultAgent("tools");
}
