import { redirect } from "next/navigation";

export default function JobSearchChatRedirect() {
  redirect("/c?agent=job-search");
}
