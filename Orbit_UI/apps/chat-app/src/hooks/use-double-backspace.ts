"use client";

import { useCallback, useRef } from "react";

const DEFAULT_WINDOW_MS = 450;

export function useDoubleBackspace(onTrigger: () => void, windowMs = DEFAULT_WINDOW_MS) {
  const countRef = useRef(0);
  const lastAtRef = useRef(0);

  const resetBackspace = useCallback(() => {
    countRef.current = 0;
  }, []);

  const handleBackspace = useCallback(
    (isEmpty: boolean, event: { key: string; preventDefault: () => void }) => {
      if (event.key !== "Backspace") {
        countRef.current = 0;
        return false;
      }

      if (!isEmpty) {
        countRef.current = 0;
        return false;
      }

      const now = Date.now();
      if (now - lastAtRef.current > windowMs) {
        countRef.current = 0;
      }

      countRef.current += 1;
      lastAtRef.current = now;
      event.preventDefault();

      if (countRef.current >= 2) {
        countRef.current = 0;
        onTrigger();
        return true;
      }

      return false;
    },
    [onTrigger, windowMs],
  );

  return { handleBackspace, resetBackspace };
}
