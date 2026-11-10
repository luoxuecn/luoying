import type { Metadata } from "next";
import { Suspense } from "react";
import { ListView } from "@/components/list-view";
import { LoadingBlock } from "@/components/media";

export const metadata: Metadata = { title: "筛选" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ListView />
    </Suspense>
  );
}
