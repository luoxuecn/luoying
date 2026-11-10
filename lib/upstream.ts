import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ApiError, asApiError, upstream } from "./errors";

const ORIGIN = "https://dsystv.com";
const CACHE_MS = 45_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0.0.0";

interface CacheEntry {
  at: number;
  text: string;
}

const cache = new Map<string, CacheEntry>();
let cookieCache = "";

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

function sessionCookie() {
  const fromEnv = process.env.DSYS_COOKIE?.trim();
  if (fromEnv) return fromEnv;
  if (cookieCache) return cookieCache;
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const line = text.split("\n").find((item) => item.startsWith("DSYS_COOKIE="));
    const value = line?.slice("DSYS_COOKIE=".length).trim().replace(/^['"]|['"]$/g, "") || "";
    if (value) cookieCache = value;
    return value;
  } catch {
    return "";
  }
}

export async function upstreamText(path: string, init?: { method?: "GET" | "POST"; body?: string }) {
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN || !allowedPath(url)) throw upstream();
  const method = init?.method || "GET";
  const key = `${method} ${url.toString()} ${init?.body || ""}`;
  const hit = cache.get(key);
  if (method === "GET" && hit && Date.now() - hit.at < CACHE_MS && !path.startsWith("/play/")) {
    return hit.text;
  }
  const cookie = sessionCookie();
  if (!cookie) throw upstream();
  try {
    const response = await fetch(url, {
      method,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "cache-control": "max-age=0",
        cookie,
        referer: ORIGIN + "/",
        "upgrade-insecure-requests": "1",
        "user-agent": USER_AGENT,
        ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body: method === "POST" ? init?.body : undefined,
      signal: AbortSignal.timeout(18_000),
      cache: "no-store",
    });
    const text = await response.text();
    if (response.status !== 200 || isChallenge(text)) throw upstream();
    if (method === "GET" && !path.startsWith("/play/")) cache.set(key, { at: Date.now(), text });
    return text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw asApiError(error);
  }
}
