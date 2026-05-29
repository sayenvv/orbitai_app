import { redirectToDefaultAgent } from "@/lib/agent-redirect";

export default async function ThemesIndex() {
  await redirectToDefaultAgent("themes");
}
