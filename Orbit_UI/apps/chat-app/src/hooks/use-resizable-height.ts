"use client";

import { useCallback, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useResizableHeight(initial: number, min: number, max: number) {
  const [height, setHeight] = useState(initial);

  const onResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = height;

      const handleMove = (moveEvent: PointerEvent) => {
        const delta = startY - moveEvent.clientY;
        setHeight(clamp(startHeight + delta, min, max));
      };

      const handleUp = () => {
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [height, max, min],
  );

  return { height, onResizeStart };
}
