import type { Metadata } from "next";
import { Suspense } from "react";
import { PlaySkeleton, PlayView } from "@/components/play-view";
import { PlayRoute } from "@/components/play-route";

export const metadata: Metadata = { title: "播放" };

export default function Page() {
  return (
    <PlayRoute>
      <Suspense fallback={<PlaySkeleton />}>
        <PlayView />
      </Suspense>
    </PlayRoute>
  );
}
