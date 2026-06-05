import { ChatThreadShimmer } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <ChatThreadShimmer />
    </div>
  );
}
