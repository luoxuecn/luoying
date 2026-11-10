import type { Metadata } from "next";
import { CATEGORIES } from "@/lib/catalog";
import { RankView } from "@/components/rank-view";
import { asApiError } from "@/lib/errors";
import { getChannel } from "@/lib/film";

export const metadata: Metadata = { title: "排行榜" };
export const instant = false;

export default async function Page() {
  const panels = await Promise.all(
    CATEGORIES.map(async (item) => {
      try {
        const data = await getChannel(item.type_id);
        return {
          typeId: item.type_id,
          name: item.type_name,
          title: (data.rank.title || `${item.type_name}排行榜`).replace(/^TOP\s*/i, ""),
          list: data.rank.list,
          error: null,
        };
      } catch (error) {
        const api = asApiError(error);
        return {
          typeId: item.type_id,
          name: item.type_name,
          title: `${item.type_name}排行榜`,
          list: [],
          error: { message: api.message, retryable: api.retryable },
        };
      }
    }),
  );
  return <RankView panels={panels} />;
}
