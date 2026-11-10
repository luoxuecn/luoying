import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { notFound, upstream } from "./errors";
import { movieIdFromHref, playIdFromHref } from "./ids";

const ORIGIN = "https://dsystv.com";
const CHANNEL_IDS = new Set(["1", "2", "3", "4", "44"]);

export interface Card {
  id: string;
  vod_name: string;
  vod_pic?: string;
  vod_remarks?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_area?: string;
  vod_lang?: string;
  vod_year?: string;
  vod_douban_score?: string;
  vod_class?: string;
  type_name?: string;
  updated_on?: string;
}

export interface MoreLink {
  typeId?: string;
  tid?: string;
  order?: string;
  target?: string;
}

export interface Section {
  title: string;
  todayCount?: number;
  more?: MoreLink;
  list: Card[];
}

type Root = cheerio.CheerioAPI;
type Node = Element;

function textOf(value: string | null | undefined) {
  return (value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function absolutePic(raw: string | undefined) {
  const value = (raw || "").trim().replace(/^['"]|['"]$/g, "");
  if (!value || /load\.gif|\/images\/rwm\.png|data:image/i.test(value)) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${ORIGIN}${value}`;
  return "";
}

function put(card: Card, key: keyof Card, value: string | undefined) {
  const next = textOf(value);
  if (!next) return;
  card[key] = next;
}

function cardFromAnchor($: Root, anchor: Node, extra?: Partial<Card>): Card | null {
  const node = $(anchor);
  const id = movieIdFromHref(node.attr("href"));
  const name = textOf(node.attr("title") || node.find("img").attr("alt"));
  if (!id || !name) return null;
  const img = node.find("img").first();
  const pic = absolutePic(img.attr("data-original")) || absolutePic(img.attr("src")) || absolutePic(node.attr("data-original"));
  const card: Card = { id, vod_name: name };
  if (pic) card.vod_pic = pic;
  put(card, "vod_remarks", node.find(".note").first().text());
  put(card, "vod_douban_score", node.find(".score").first().text());
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) put(card, key as keyof Card, value);
    }
  }
  return card;
}

function dedupe(list: Card[]) {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function moreFromHref(href: string | undefined): MoreLink | undefined {
  if (!href) return undefined;
  if (href.includes("latest.php")) return { target: "latest" };
  let url: URL;
  try {
    url = new URL(href, ORIGIN);
  } catch {
    return undefined;
  }
  const tid = url.searchParams.get("tid") || "";
  const order = url.searchParams.get("order") || "time";
  if (!tid) return undefined;
  if (CHANNEL_IDS.has(tid)) return { typeId: tid, order };
  return { tid, order };
}

function moreLink($: Root, box: ReturnType<Root>) {
  const link = box
    .find("a")
    .toArray()
    .find((anchor) => textOf($(anchor).text()).startsWith("更多") || $(anchor).attr("title") === "更多");
  return moreFromHref(link ? $(link).attr("href") : undefined);
}

function metaFromSubtitle(subtitle: string): Partial<Card> {
  const value = textOf(subtitle);
  if (!value) return {};
  const yearArea = value.match(/^(\d{4})\s+(\S+)$/);
  if (yearArea) return { vod_year: yearArea[1], vod_area: yearArea[2] };
  return { vod_actor: value };
}

function enrichCard($: Root, anchor: Node, card: Card) {
  const root = $(anchor).parent();
  const meta = root.find("[data-card-meta]").first();
  if (meta.length) {
    put(card, "vod_actor", meta.find("[data-card-actor]").text());
    put(card, "vod_year", meta.find("[data-card-year]").text());
    put(card, "vod_area", meta.find("[data-card-area]").text());
    if (!card.vod_actor && !card.vod_year && !card.vod_area) {
      Object.assign(card, omitEmpty(metaFromSubtitle(meta.text())));
    }
  } else {
    const subtitle = root.find(".subtitle").first().text();
    Object.assign(card, omitEmpty(metaFromSubtitle(subtitle)));
  }
  const title = textOf(root.find(".title a, h3 a, h5 a").first().text());
  if (title) card.vod_name = title;
}

function omitEmpty(extra: Partial<Card>) {
  const next: Partial<Card> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value) next[key as keyof Card] = value;
  }
  return next;
}

function cardsIn($: Root, box: ReturnType<Root>) {
  const list: Card[] = [];
  box.find("a.videopic").each((_, anchor) => {
    if ($(anchor).closest(".hy-video-text-list, .swiper-wrapper").length) return;
    const card = cardFromAnchor($, anchor);
    if (!card) return;
    enrichCard($, anchor, card);
    list.push(card);
  });
  return dedupe(list);
}

function assertPage(html: string) {
  if (!html || html.includes("Just a moment") || html.includes("Performing security verification") || html.includes("cf-browser-verification")) {
    throw upstream();
  }
}

export function parseHome(html: string) {
  assertPage(html);
  const $ = cheerio.load(html);
  const banner: Card[] = [];
  $(".swiper-wrapper a.videopic").each((_, anchor) => {
    const card = cardFromAnchor($, anchor);
    if (!card) return;
    if (!card.vod_remarks) card.vod_remarks = "";
    banner.push(card);
  });
  const sections: Section[] = [];
  $(".hy-video-head").each((_, head) => {
    const title = textOf($(head).find("h2").first().text());
    if (!title || title.includes("友情链接")) return;
    const box = $(head).parent();
    const section: Section = {
      title,
      more: moreLink($, $(head)),
      list: cardsIn($, box),
    };
    if (title.includes("最近更新")) {
      const count = $.root().text().match(/今日更新[:：]\s*(\d+)\s*部/);
      if (count) section.todayCount = Number(count[1]);
    }
    sections.push(section);
  });
  if (!banner.length && !sections.length) throw upstream();
  return {
    banner: dedupe(banner),
    shortcuts: [
      { name: "影片排行", order: "hit", typeId: "1" },
      { name: "最近更新", target: "latest" },
    ],
    sections,
  };
}

function channelRank($: Root, typeId: string, typeName: string) {
  const covers = new Map<string, string>();
  $("a.videopic").each((_, anchor) => {
    const card = cardFromAnchor($, anchor);
    if (card?.vod_pic) covers.set(card.id, card.vod_pic);
  });
  const panel = $(".channel-ranking-panel").first();
  const list: Card[] = [];
  panel.find("li").each((_, item) => {
    const row = $(item);
    const anchor = row.find("a[href*='/movie/']").first();
    const id = movieIdFromHref(anchor.attr("href"));
    const name = textOf(anchor.attr("title"));
    if (!id || !name) return;
    const card: Card = { id, vod_name: name };
    const cover = covers.get(id);
    if (cover) card.vod_pic = cover;
    const aside = textOf(row.find(".pull-right").first().text());
    if (/^\d+(?:\.\d+)?$/.test(aside)) card.vod_douban_score = aside;
    else put(card, "vod_remarks", aside);
    list.push(card);
  });
  const ranked = dedupe(list);
  if (!ranked.length) return null;
  const title = textOf(panel.find("h4").first().text()) || `${typeName}排行榜`;
  return { title, more: moreLink($, panel) || { typeId, order: "weekhit" }, list: ranked };
}

export function parseChannel(html: string, typeId: string, typeName: string) {
  assertPage(html);
  const $ = cheerio.load(html);
  let rank: { title: string; more?: MoreLink; list: Card[] } | null = channelRank($, typeId, typeName);
  const sections: Section[] = [];
  $(".hy-layout").each((_, layout) => {
    const box = $(layout);
    const title = textOf(box.find("h2, h3, h4").first().text());
    if (!title || title.includes("友情链接")) return;
    const list = cardsIn($, box);
    const more = moreLink($, box);
    if (title.includes("排行")) {
      if (!rank) rank = { title, more: more || { typeId, order: "douban" }, list };
      return;
    }
    sections.push({ title, more, list });
  });
  if (!sections.length) throw upstream();
  return {
    type_id: typeId,
    type_name: typeName,
    rank: rank || { title: `${typeName}排行榜`, more: { typeId, order: "douban" }, list: [] },
    sections,
  };
}

function pageInfo(html: string, fallbackPage: number) {
  const $ = cheerio.load(html);
  const plain = textOf($.root().text());
  const totalMatch = plain.match(/共有\s*[“"']?\s*(\d+)\s*[”"']?\s*个影片/) || plain.match(/相关的\s*[“"']?\s*(\d+)\s*[”"']?\s*条结果/);
  const currentMatch = plain.match(/当前第\s*[“"']?\s*(\d+)/);
  const fraction = textOf($(".hy-page .num").first().text()).match(/(\d+)\s*\/\s*(\d+)/);
  const page = currentMatch ? Number(currentMatch[1]) : fraction ? Number(fraction[1]) : fallbackPage;
  const pageCount = fraction ? Number(fraction[2]) : page;
  const total = totalMatch ? Number(totalMatch[1]) : undefined;
  return { page, pageCount, total, totalExact: Boolean(totalMatch) };
}

function listPayload(list: Card[], info: ReturnType<typeof pageInfo>) {
  const page = info.page || 1;
  const pageCount = Math.max(info.pageCount || 1, 1);
  if (list.length === 0 && (info.total ?? 0) > 0) throw upstream();
  const empty = list.length === 0;
  return {
    page,
    pageSize: list.length,
    pageCount: empty && !info.total ? 1 : pageCount,
    total: info.totalExact ? info.total || 0 : list.length,
    totalExact: info.totalExact,
    hasNext: page < pageCount,
    empty,
    list,
  };
}

export function parseVideoList(html: string, fallbackPage: number) {
  assertPage(html);
  const $ = cheerio.load(html);
  const looksLikeList = html.includes("hy-video-list") || html.includes("个影片") || html.includes("筛选结果");
  if (!looksLikeList) throw upstream();
  const list: Card[] = [];
  $(".hy-video-list li a.videopic").each((_, anchor) => {
    const card = cardFromAnchor($, anchor);
    if (!card) return;
    enrichCard($, anchor, card);
    list.push(card);
  });
  return listPayload(dedupe(list), pageInfo(html, fallbackPage));
}

export function parseLatest(html: string) {
  assertPage(html);
  const $ = cheerio.load(html);
  if (!html.includes("latest") && !$("article").length) throw upstream();
  const list: Card[] = [];
  $("article").each((_, article) => {
    const anchor = $(article).find("a.videopic").first().get(0);
    if (!anchor) return;
    const card = cardFromAnchor($, anchor);
    if (!card) return;
    enrichCard($, anchor, card);
    const time = $(article).find("time").attr("datetime") || "";
    put(card, "updated_on", time);
    list.push(card);
  });
  const items = dedupe(list);
  if (!items.length) throw upstream();
  return {
    page: 1,
    pageSize: items.length,
    pageCount: 1,
    total: items.length,
    totalExact: false,
    hasNext: false,
    empty: false,
    list: items,
  };
}

function metaValue($: Root, li: Node) {
  const node = $(li);
  const meta = textOf(node.attr("data-video-meta"));
  if (meta && !meta.includes("[") && !/searchlist/i.test(meta)) return meta;
  const clone = node.clone();
  clone.find(".text-muted").remove();
  return textOf(clone.text());
}

export function parseSearch(html: string, query: string, fallbackPage: number) {
  assertPage(html);
  const $ = cheerio.load(html);
  if (!html.includes("搜索") && !html.includes("条结果") && !$(".hy-video-details").length) throw upstream();
  const list: Card[] = [];
  $(".hy-video-details dl.content, .hy-video-details .item dl").each((_, row) => {
    const box = $(row);
    const anchor = box.find("a.videopic").first().get(0);
    const name = textOf(box.find(".head a, .head h3").first().text());
    const card = anchor ? cardFromAnchor($, anchor, { vod_name: name }) : null;
    if (!card) return;
    if (name) card.vod_name = name;
    box.find(".video-meta-list li").each((__, li) => {
      const label = textOf($(li).find(".text-muted").first().text()).replace(/[:：]/g, "");
      const value = metaValue($, li);
      if (!value) return;
      if (label === "主演") put(card, "vod_actor", value);
      if (label === "导演") put(card, "vod_director", value);
      if (label === "地区") put(card, "vod_area", value);
      if (label === "语言") put(card, "vod_lang", value);
      if (label === "年份") put(card, "vod_year", value);
      if (label === "豆瓣") put(card, "vod_douban_score", value);
      if (label === "类型") put(card, "type_name", value);
      if (label === "剧情") put(card, "vod_class", value);
    });
    list.push(card);
  });
  const payload = listPayload(dedupe(list), pageInfo(html, fallbackPage));
  return { ...payload, query };
}

export interface PlaySource {
  name: string;
  episodes: { name: string; playId: string }[];
}

export function parseDetail(html: string, id: string) {
  assertPage(html);
  const $ = cheerio.load(html);
  const name = textOf($("h1").first().text());
  const sources: PlaySource[] = [];
  const seenLines = new Set<string>();
  $("#playlist .panel").each((_, panel) => {
    const box = $(panel);
    const line = box.attr("data-playlist-line") || box.attr("data-playlist-name") || String(sources.length);
    if (seenLines.has(line)) return;
    seenLines.add(line);
    const sourceName = textOf(box.attr("data-playlist-name") || box.find("a.option").attr("title") || box.find(".playlist-line-name").first().text()) || `线路${sources.length + 1}`;
    const episodes: PlaySource["episodes"] = [];
    const seen = new Set<string>();
    box.find('a[href*="/play/"]').each((__, anchor) => {
      const playId = playIdFromHref($(anchor).attr("href"));
      const episodeName = textOf($(anchor).attr("title") || $(anchor).text());
      if (!playId || !episodeName || seen.has(playId)) return;
      seen.add(playId);
      episodes.push({ name: episodeName, playId });
    });
    if (episodes.length) sources.push({ name: sourceName, episodes });
  });
  if (!name && !sources.length) throw notFound();
  const anchor = $(".hy-video-details a.videopic").first();
  const img = anchor.find("img").first();
  const pic = absolutePic(img.attr("src")) || absolutePic(img.attr("data-original")) || absolutePic(anchor.attr("data-original"));
  const data: Record<string, unknown> = {
    id,
    vod_name: name,
    vod_play_sources: sources,
    related: [],
  };
  if (pic) data.vod_pic = pic;
  const remarks = textOf(anchor.find(".note").first().text());
  if (remarks) data.vod_remarks = remarks;
  $(".hy-video-details .video-meta-list li").each((_, li) => {
    const label = textOf($(li).find(".text-muted").first().text()).replace(/[:：]/g, "");
    const value = metaValue($, li);
    if (!value) return;
    if (label === "主演") data.vod_actor = value;
    if (label === "导演") data.vod_director = value;
    if (label === "地区") data.vod_area = value;
    if (label === "语言") data.vod_lang = value;
    if (label === "年份") data.vod_year = value;
    if (label === "豆瓣") data.vod_douban_score = value;
    if (label === "类型") data.type_name = value;
    if (label === "又名") data.other = value;
  });
  const plot = textOf($(".video-plot").first().text());
  if (plot) data.vod_content = plot;
  return data;
}

export function parsePlay(html: string) {
  assertPage(html);
  const match = html.match(/var\s+now\s*=\s*(?:"([^"]*)"|'([^']*)')/);
  const direct = (match?.[1] || match?.[2] || "").trim();
  const media = /^https?:\/\//i.test(direct) && !/dsystv\.com\/(?:play|movie|search|frim)\b/i.test(direct);
  if (media) {
    return { media: true as const, url: direct };
  }
  if (html.includes("在线观看") || html.includes("playlist") || html.includes("var now")) {
    return { media: false as const, url: "" };
  }
  throw upstream();
}

export function parseRss(xml: string) {
  assertPage(xml);
  if (!xml.includes("<rss") || !xml.includes("<channel")) throw upstream();
  const channelTitle = decodeXml((xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
  const updatedRaw = (xml.match(/<lastBuildDate>([\s\S]*?)<\/lastBuildDate>/) || [])[1] || "";
  const list = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((item) => {
    const block = item[1];
    const title = decodeXml((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
    const link = decodeXml((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "").trim();
    const id = movieIdFromHref(link);
    const description = decodeXml((block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "").trim();
    const pic = absolutePic((block.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1]);
    const pubRaw = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "";
    const [remarks, actor] = description.split(/[;；]\s*主演[:：]/);
    if (!id || !title) return null;
    const card: Card & { pubDate?: string } = { id, vod_name: title };
    if (pic) card.vod_pic = pic;
    if (textOf(remarks)) card.vod_remarks = textOf(remarks);
    if (textOf(actor)) card.vod_actor = textOf(actor);
    const pubDate = rfc822(pubRaw);
    if (pubDate) card.pubDate = pubDate;
    return card;
  }).filter((item): item is Card & { pubDate?: string } => Boolean(item));
  if (!list.length) throw upstream();
  return {
    title: channelTitle,
    updated_at: rfc822(updatedRaw),
    list,
  };
}

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function rfc822(value: string) {
  const match = value.trim().match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})/);
  if (!match) return "";
  const month = MONTHS[match[2]];
  if (!month) return "";
  const day = match[1].padStart(2, "0");
  const zone = `${match[7].slice(0, 3)}:${match[7].slice(3)}`;
  return `${match[3]}-${month}-${day}T${match[4]}:${match[5]}:${match[6]}${zone}`;
}
