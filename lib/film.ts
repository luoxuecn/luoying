import {
  categoriesPayload,
  categoryName,
  isAllowedFilter,
  isAllowedOrder,
  isChannelId,
  type Category,
} from "./catalog";
import { invalid } from "./errors";
import { moviePath, playPath } from "./ids";
import { parseChannel, parseDetail, parseHome, parseLatest, parsePlay, parseRss, parseSearch, parseVideoList } from "./parse";
import { upstreamText } from "./upstream";

const PLAY_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function readPage(params: URLSearchParams) {
  const raw = params.get("page");
  if (raw == null || raw === "") return 1;
  if (!/^\d+$/.test(raw)) throw invalid("页码不正确");
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1) throw invalid("页码不正确");
  return page;
}

function readChannel(params: URLSearchParams) {
  const raw = params.get("typeId");
  if (raw == null || raw === "") return "1" as Category["type_id"];
  if (!isChannelId(raw)) throw invalid("频道不正确");
  return raw;
}

function readFilter(params: URLSearchParams, typeId: Category["type_id"], key: "jq" | "area" | "year" | "yuyan" | "letter") {
  const raw = params.get(key);
  if (raw == null || raw === "") return "";
  if (!isAllowedFilter(typeId, key, raw)) throw invalid("筛选条件不正确");
  return raw;
}

export function getCategories() {
  return categoriesPayload();
}

export async function getHome() {
  const html = await upstreamText("/");
  return parseHome(html);
}

export async function getChannel(typeId: string) {
  if (!isChannelId(typeId)) throw invalid("频道不正确");
  const html = await upstreamText(`/frim/index${typeId}.html`);
  return parseChannel(html, typeId, categoryName(typeId));
}

export async function getVideos(params: URLSearchParams) {
  const typeId = readChannel(params);
  const tidRaw = params.get("tid");
  let tid: string = typeId;
  if (tidRaw != null && tidRaw !== "") {
    if (!isAllowedFilter(typeId, "tid", tidRaw)) throw invalid("类型不正确");
    tid = tidRaw;
  }
  const orderRaw = params.get("order");
  const order = orderRaw == null || orderRaw === "" ? "time" : orderRaw;
  if (!isAllowedOrder(order)) throw invalid("排序不正确");
  const page = readPage(params);
  const query = new URLSearchParams({
    searchtype: "5",
    order,
    tid,
    year: readFilter(params, typeId, "year"),
    letter: readFilter(params, typeId, "letter"),
    yuyan: readFilter(params, typeId, "yuyan"),
    state: "",
    money: "",
    ver: "",
    jq: readFilter(params, typeId, "jq"),
    area: readFilter(params, typeId, "area"),
    page: String(page),
  });
  const html = await upstreamText(`/search.php?${query.toString()}`);
  return parseVideoList(html, page);
}

export async function getLatest() {
  const html = await upstreamText("/latest.php");
  return parseLatest(html);
}

export async function searchVideos(params: URLSearchParams) {
  const query = (params.get("q") ?? "").trim();
  if (!query) throw invalid("搜索词不能为空");
  if (query.length > 80) throw invalid("搜索词不正确");
  const page = readPage(params);
  const html = await upstreamText(`/search.php?page=${page}`, {
    method: "POST",
    body: `searchword=${encodeURIComponent(query)}`,
  });
  return parseSearch(html, query, page);
}

export async function getVideo(id: string) {
  const path = moviePath(id);
  if (!path) throw invalid("编号无效");
  const html = await upstreamText(path);
  return parseDetail(html, id);
}

export async function getPlay(params: URLSearchParams) {
  const playId = (params.get("playId") ?? "").trim();
  const path = playPath(playId);
  if (!path) throw invalid("编号无效");
  const html = await upstreamText(path);
  const parsed = parsePlay(html);
  if (!parsed.media) {
    return { parse: 1, url: "", urls: [], header: {} };
  }
  return {
    parse: 0,
    url: parsed.url,
    urls: [{ name: "播放", url: parsed.url }],
    header: {
      "User-Agent": PLAY_UA,
      Referer: `https://dsystv.com${path}`,
    },
  };
}

export async function getRss() {
  const xml = await upstreamText("/xml/rss.xml");
  return parseRss(xml);
}
