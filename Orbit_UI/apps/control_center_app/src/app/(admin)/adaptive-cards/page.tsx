import { redirect } from "next/navigation";
import { DEFAULT_AGENT_ID } from "@/lib/data";

export default function AdaptiveCardsIndex() {
  redirect(`/adaptive-cards/${DEFAULT_AGENT_ID}`);
}
