import { io } from "next/cache";
import { ApiError, asApiError, upstream } from "./errors";

const ORIGIN = "https://dsystv.com";
export const UPSTREAM_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

interface CacheEntry {
  at: number;
  text: string;
}

const cache = new Map<string, CacheEntry>();

function allowedPath(url: URL) {
  return (
    url.pathname === "/" ||
    url.pathname === "/latest.php" ||
    url.pathname === "/search.php" ||
    url.pathname === "/xml/rss.xml" ||
    /^\/frim\/index(?:1|2|3|4|44)\.html$/.test(url.pathname) ||
    /^\/movie\/index\d+\.html$/.test(url.pathname) ||
    /^\/play\/\d+-\d+-\d+\.html$/.test(url.pathname)
  );
}

function isChallenge(html: string) {
  return !html || html.includes("Just a moment") || html.includes("Performing security verification") || html.includes("cf-browser-verification");
}

function cacheTtl(path: string, method: string) {
  if (path.startsWith("/play/")) return 0;
  if (method === "POST") return 600_000;
  if (path.startsWith("/movie/")) return 1_800_000;
  return 900_000;
}

function refererFor(url: URL, method: string) {
  if (url.pathname.startsWith("/play/")) return url.toString();
  if (method === "POST") return `${ORIGIN}/search.php`;
  return `${ORIGIN}/`;
}

async function requestText(url: URL, method: "GET" | "POST", body?: string) {
  let current = url;
  const referer = refererFor(url, method);
  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetch(current, {
      method,
      headers: {
        "User-Agent": UPSTREAM_UA,
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        Referer: referer,
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: method === "POST" ? body : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 5) throw upstream();
      const next = new URL(location, current);
      if (next.origin !== ORIGIN || !allowedPath(next)) throw upstream();
      current = next;
      continue;
    }
    const text = await response.text();
    if (response.status !== 200 || isChallenge(text)) throw upstream();
    return text;
  }
  throw upstream();
}

export async function upstreamText(path: string, init?: { method?: "GET" | "POST"; body?: string }) {
  await io();
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN || !allowedPath(url)) throw upstream();
  const method = init?.method || "GET";
  const key = `${method} ${url.toString()} ${init?.body || ""}`;
  const ttl = cacheTtl(url.pathname, method);
  const hit = cache.get(key);
  if (ttl > 0 && hit && Date.now() - hit.at < ttl) return hit.text;
  try {
    const text = await requestText(url, method, init?.body);
    if (ttl > 0) cache.set(key, { at: Date.now(), text });
    return text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw asApiError(error);
  }
}
