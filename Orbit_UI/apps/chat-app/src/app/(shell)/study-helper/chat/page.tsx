"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { navigateToAgentChat } from "@/lib/chat-navigation";

export default function StudyHelperChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    navigateToAgentChat(router, "study-helper");
  }, [router]);

  return null;
}
