import type { Metadata } from "next";
import { HistoryView } from "@/components/history-view";

export const metadata: Metadata = { title: "播放记录" };

export default function Page() {
  return <HistoryView />;
}
