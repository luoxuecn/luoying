import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { ApiError, asApiError, upstream, upstreamTimeout } from "./errors";

const ORIGIN = "https://dsystv.com";
const CACHE_MS = 45_000;

interface CacheEntry {
  at: number;
  text: string;
}

interface BrowserSlot {
  browser: Promise<Browser>;
  ready: Promise<void> | null;
}

const globalSlot = globalThis as typeof globalThis & { __luoxueBrowser?: BrowserSlot };
const cache = new Map<string, CacheEntry>();
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

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

async function launchBrowser() {
  if (!process.env.DISPLAY) process.env.DISPLAY = ":1";
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: false,
    ignoreDefaultArgs: ["--enable-automation"],
    userDataDir: "/tmp/luoxue-chrome",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1280,900",
      "--lang=zh-CN",
    ],
  });
  return browser;
}

async function slot() {
  if (!globalSlot.__luoxueBrowser) {
    globalSlot.__luoxueBrowser = { browser: launchBrowser(), ready: null };
  }
  return globalSlot.__luoxueBrowser;
}

async function pageOf(browser: Browser) {
  const pages = await browser.pages();
  return pages[0] || browser.newPage();
}

async function clickVerify(page: Page) {
  for (const frame of page.frames()) {
    const point = await frame
      .evaluate(() => {
        const nodes = Array.from(document.querySelectorAll("span, label, div"));
        const el = nodes.find((node) => (node.textContent || "").trim() === "Verify you are human");
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) return null;
        return { x: rect.x + Math.min(20, rect.width / 2), y: rect.y + rect.height / 2 };
      })
      .catch(() => null);
    if (!point) continue;
    const element = await frame.frameElement();
    if (element) {
      const box = await element.boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + point.x, box.y + point.y);
      return;
    }
    await page.mouse.click(point.x, point.y);
    return;
  }
}

async function probe(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("https://dsystv.com/", { credentials: "include" });
    const text = await response.text();
    return text.includes("袋鼠影视") && !text.includes("Just a moment");
  });
}

async function ensureReady(page: Page, current: BrowserSlot) {
  if (!current.ready) {
    current.ready = (async () => {
      await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const ok = await probe(page).catch(() => false);
        if (ok) return;
        await clickVerify(page).catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      const ok = await probe(page).catch(() => false);
      if (!ok) throw upstreamTimeout();
    })().catch((error) => {
      current.ready = null;
      throw error;
    });
  }
  await current.ready;
}

async function read(page: Page, url: string, method: "GET" | "POST", body?: string) {
  return page.evaluate(
    async (target, verb, payload) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18_000);
      try {
        const response = await fetch(target, {
          method: verb,
          credentials: "include",
          headers: verb === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
          body: verb === "POST" ? payload : undefined,
          signal: controller.signal,
        });
        const text = await response.text();
        return { status: response.status, text, aborted: false };
      } catch {
        return { status: 0, text: "", aborted: true };
      } finally {
        clearTimeout(timer);
      }
    },
    url,
    method,
    body || "",
  );
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
  try {
    const text = await enqueue(async () => {
      const current = await slot();
      const browser = await current.browser;
      const page = await pageOf(browser);
      await ensureReady(page, current);
      let result = await read(page, url.toString(), method, init?.body);
      if (result.aborted) throw upstreamTimeout();
      if (result.status !== 200 || isChallenge(result.text)) {
        current.ready = null;
        await ensureReady(page, current);
        result = await read(page, url.toString(), method, init?.body);
      }
      if (result.aborted) throw upstreamTimeout();
      if (result.status !== 200 || isChallenge(result.text)) throw upstream();
      return result.text;
    });
    if (method === "GET" && !path.startsWith("/play/")) cache.set(key, { at: Date.now(), text });
    return text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const wrapped = asApiError(error);
    if (/Failed to launch|userDataDir|SingletonLock|browser has disconnected/i.test(error instanceof Error ? error.message : "")) {
      globalSlot.__luoxueBrowser = undefined;
    }
    throw wrapped;
  }
}
