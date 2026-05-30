import { redirect } from "next/navigation";

export default function TripAdviserChatRedirect() {
  redirect("/c?agent=trip-adviser");
}
