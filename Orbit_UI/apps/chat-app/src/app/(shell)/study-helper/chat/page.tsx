import { redirect } from "next/navigation";

export default function StudyHelperChatRedirect() {
  redirect("/c?agent=study-helper");
}
