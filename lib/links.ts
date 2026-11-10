export function listHref(
  more: { typeId?: string; tid?: string; order?: string; target?: string } | undefined,
  channelId?: string,
) {
  if (!more) return "/list";
  if (more.target === "latest") return channelId ? `/latest?typeId=${channelId}` : "/latest";
  const params = new URLSearchParams();
  params.set("typeId", more.typeId || channelId || "1");
  if (more.tid) params.set("tid", more.tid);
  if (more.order && more.order !== "time") params.set("order", more.order);
  return `/list?${params.toString()}`;
}
