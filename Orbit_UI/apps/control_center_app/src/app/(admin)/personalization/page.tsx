import { redirectToDefaultAgent } from "@/lib/agent-redirect";

export default async function PersonalizationIndex() {
  await redirectToDefaultAgent("personalization");
}
