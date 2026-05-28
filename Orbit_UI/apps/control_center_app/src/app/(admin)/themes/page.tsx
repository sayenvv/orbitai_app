import { redirect } from "next/navigation";
import { DEFAULT_AGENT_ID } from "@/lib/data";

export default function ThemesIndex() {
  redirect(`/themes/${DEFAULT_AGENT_ID}`);
}
