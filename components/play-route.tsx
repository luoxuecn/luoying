"use client";

import { useLayoutEffect, type ReactNode } from "react";

export function PlayRoute({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.play = "true";
    return () => {
      delete document.documentElement.dataset.play;
    };
  }, []);
  return children;
}
