import { redirect } from "next/navigation";
import { DEFAULT_AGENT_ID } from "@/lib/data";

export default function PersonalizationIndex() {
  redirect(`/personalization/${DEFAULT_AGENT_ID}`);
}
