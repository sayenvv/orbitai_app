import { redirect } from "next/navigation";
import { DEFAULT_AGENT_ID } from "@/lib/data";

export default function ToolsIndex() {
  redirect(`/tools/${DEFAULT_AGENT_ID}`);
}
