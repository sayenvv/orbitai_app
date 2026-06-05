import { cn } from "@/lib/utils";

/** Centered message/input column — not the scroll container. */
export function chatContentClass(actionsInset = false) {
  return cn(
    "mx-auto w-full max-w-4xl px-4 sm:px-6",
    actionsInset && "md:max-xl:pr-16 lg:max-xl:pr-20",
  );
}
