import type { Metadata } from "next";
import { Suspense } from "react";
import { PlaySkeleton, PlayView } from "@/components/play-view";

export const metadata: Metadata = { title: "播放" };

export default function Page() {
  return (
    <Suspense fallback={<PlaySkeleton />}>
      <PlayView />
    </Suspense>
  );
}
