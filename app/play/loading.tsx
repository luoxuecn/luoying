import { PlaySkeleton } from "@/components/play-view";
import { PlayRoute } from "@/components/play-route";

export default function Loading() {
  return (
    <PlayRoute>
      <PlaySkeleton />
    </PlayRoute>
  );
}
