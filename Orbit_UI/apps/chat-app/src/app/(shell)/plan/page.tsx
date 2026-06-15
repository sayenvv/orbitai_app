import { redirect } from "next/navigation";

import { studioWithPhase } from "@/lib/routes";

export default function PlanPage() {
  redirect(studioWithPhase("plan"));
}
