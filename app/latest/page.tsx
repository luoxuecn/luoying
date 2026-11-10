import type { Metadata } from "next";
import { Suspense } from "react";
import { LatestView } from "@/components/latest-view";
import { LoadingBlock } from "@/components/media";

export const metadata: Metadata = { title: "最近更新" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <LatestView />
    </Suspense>
  );
}
