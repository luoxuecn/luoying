import { filterHref, latestHref } from "./paths";

export function listHref(
  more: { typeId?: string; tid?: string; order?: string; target?: string } | undefined,
  channelId?: string,
) {
  if (!more) return filterHref({ typeId: channelId || "1" });
  if (more.target === "latest") return latestHref(channelId);
  return filterHref({
    typeId: more.typeId || channelId || "1",
    tid: more.tid,
    order: more.order,
  });
}
