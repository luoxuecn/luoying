import type { Metadata } from "next";
import { RankView } from "@/components/rank-view";

export const metadata: Metadata = { title: "排行榜" };

export default function Page() {
  return <RankView />;
}
