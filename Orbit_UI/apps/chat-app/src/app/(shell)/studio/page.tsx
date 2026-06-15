import { Suspense } from "react";

import { StudioPanel } from "@/components/studio/studio-panel";

export default function StudioPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={null}>
        <StudioPanel />
      </Suspense>
    </div>
  );
}
