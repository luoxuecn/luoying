import { isChannelId, type Category } from "./catalog";
import { invalid } from "./errors";

export interface ListQuery {
  typeId: Category["type_id"];
  tid: string;
  jq: string;
  area: string;
  year: string;
  yuyan: string;
  letter: string;
  order: string;
  page: number;
}

const LIST_SLOTS = 9;

function encodeSlot(value: string, letter = false) {
  if (!value) return "_";
  if (letter && value === "0-9") return "09";
  return value;
}

function decodeSlot(value: string, letter = false) {
  if (!value || value === "_") return "";
  if (letter && value === "09") return "0-9";
  return value;
}

export function filterHref(query: {
  typeId?: string;
  tid?: string;
  jq?: string;
  area?: string;
  year?: string;
  yuyan?: string;
  letter?: string;
  order?: string;
  page?: number;
}) {
  const typeId = query.typeId && isChannelId(query.typeId) ? query.typeId : "1";
  const tid = query.tid && query.tid !== typeId ? query.tid : typeId;
  const parts = [
    typeId,
    tid,
    encodeSlot(query.jq || ""),
    encodeSlot(query.area || ""),
    encodeSlot(query.year || ""),
    encodeSlot(query.yuyan || ""),
    encodeSlot(query.letter || "", true),
    query.order && query.order !== "time" ? query.order : "time",
    String(query.page && query.page > 1 ? query.page : 1),
  ];
  const defaults = [typeId, typeId, "_", "_", "_", "_", "_", "time", "1"];
  let end = parts.length;
  while (end > 1 && parts[end - 1] === defaults[end - 1]) end -= 1;
  return `/list/${parts.slice(0, end).map((part) => encodeURIComponent(part)).join("-")}`;
}

export function parseListSlug(slug: string): ListQuery {
  let text = slug;
  try {
    text = decodeURIComponent(slug);
  } catch {
    throw invalid("筛选地址不正确");
  }
  const raw = text.split("-");
  if (raw.length < 1 || raw.length > LIST_SLOTS || raw.some((part) => part === "")) throw invalid("筛选地址不正确");
  const typeId = raw[0] || "";
  if (!isChannelId(typeId)) throw invalid("频道不正确");
  const defaults = [typeId, typeId, "_", "_", "_", "_", "_", "time", "1"];
  const parts = defaults.map((item, index) => raw[index] ?? item);
  const pageRaw = parts[8];
  if (!/^\d+$/.test(pageRaw)) throw invalid("页码不正确");
  const page = Number(pageRaw);
  if (!Number.isSafeInteger(page) || page < 1) throw invalid("页码不正确");
  return {
    typeId,
    tid: decodeSlot(parts[1]) || typeId,
    jq: decodeSlot(parts[2]),
    area: decodeSlot(parts[3]),
    year: decodeSlot(parts[4]),
    yuyan: decodeSlot(parts[5]),
    letter: decodeSlot(parts[6], true),
    order: decodeSlot(parts[7]) || "time",
    page,
  };
}

export function listSearchParams(query: ListQuery) {
  const params = new URLSearchParams();
  params.set("typeId", query.typeId);
  if (query.tid && query.tid !== query.typeId) params.set("tid", query.tid);
  if (query.jq) params.set("jq", query.jq);
  if (query.area) params.set("area", query.area);
  if (query.year) params.set("year", query.year);
  if (query.yuyan) params.set("yuyan", query.yuyan);
  if (query.letter) params.set("letter", query.letter);
  if (query.order && query.order !== "time") params.set("order", query.order);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export function queryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export function filterHrefFromSearch(raw: Record<string, string | string[] | undefined>) {
  const typeId = queryValue(raw.typeId) || "1";
  const page = Number(queryValue(raw.page) || "1");
  return filterHref({
    typeId,
    tid: queryValue(raw.tid),
    jq: queryValue(raw.jq),
    area: queryValue(raw.area),
    year: queryValue(raw.year),
    yuyan: queryValue(raw.yuyan),
    letter: queryValue(raw.letter),
    order: queryValue(raw.order) || "time",
    page: Number.isFinite(page) ? page : 1,
  });
}

export function channelHref(typeId: string) {
  return filterHref({ typeId, area: "大陆" });
}

export function searchHref(query: string, page = 1) {
  const keyword = encodeURIComponent(query.trim());
  return page > 1 ? `/search/${keyword}/${page}` : `/search/${keyword}`;
}

export function playHref(id: string, playId?: string) {
  return playId ? `/play/${id}/${playId}` : `/play/${id}`;
}

export function latestHref(typeId?: string) {
  return typeId ? `/latest/${typeId}` : "/latest";
}

export function decodePathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function searchQueryFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "search" || !parts[1]) return "";
  return decodePathSegment(parts[1]);
}

export function listTypeFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "list" || !parts[1]) return "";
  return parts[1].split("-")[0] || "";
}
