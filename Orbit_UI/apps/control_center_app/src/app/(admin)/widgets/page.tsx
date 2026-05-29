import { redirectToDefaultAgent } from "@/lib/agent-redirect";

export default async function WidgetsIndex() {
  await redirectToDefaultAgent("widgets");
}
