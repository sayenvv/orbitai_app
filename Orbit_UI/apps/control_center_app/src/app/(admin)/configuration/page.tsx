import { redirect } from "next/navigation";
import { DEFAULT_AGENT_ID } from "@/lib/data";

export default function ConfigurationIndex() {
  redirect(`/configuration/${DEFAULT_AGENT_ID}`);
}
