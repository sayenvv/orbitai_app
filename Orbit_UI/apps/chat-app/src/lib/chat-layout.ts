import { cn } from "@/lib/utils";

/** Centered message/input column — not the scroll container. */
export function chatContentClass(actionsInset = false) {
  return cn(
    "mx-auto w-full max-w-4xl px-4 sm:px-6",
    actionsInset && "pr-16 md:pr-20",
  );
}

/** @deprecated use chatContentClass */
export const chatColumnClass = chatContentClass;
