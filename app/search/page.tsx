import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/search-view";
import { LoadingBlock } from "@/components/media";

export const metadata: Metadata = { title: "搜索" };

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock kind="rows" />}>
      <SearchView />
    </Suspense>
  );
}
