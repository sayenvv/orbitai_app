import { redirectToDefaultAgent } from "@/lib/agent-redirect";

export default async function ConfigurationIndex() {
  await redirectToDefaultAgent("configuration");
}
