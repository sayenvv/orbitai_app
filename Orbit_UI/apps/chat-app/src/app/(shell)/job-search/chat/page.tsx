"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { navigateToAgentChat } from "@/lib/chat-navigation";

export default function JobSearchChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    navigateToAgentChat(router, "job-search");
  }, [router]);

  return null;
}
