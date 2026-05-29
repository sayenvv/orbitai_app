import { redirectToDefaultAgent } from "@/lib/agent-redirect";

export default async function AdaptiveCardsIndex() {
  await redirectToDefaultAgent("adaptive-cards");
}
