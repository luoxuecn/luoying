import { createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { invalid, upstream } from "./errors";
import { UPSTREAM_UA } from "./upstream";

const TTL_MS = 6 * 60 * 60 * 1000;
const PLAYLIST_LIMIT = 2 * 1024 * 1024;

function secret() {
  const value = process.env.MEDIA_PROXY_SECRET;
  if (!value) throw new Error("MEDIA_PROXY_SECRET is not set");
  return value;
}

function signPayload(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signMediaUrl(url: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ u: url, e: now + TTL_MS })).toString("base64url");
  return `/api/media/${payload}~${signPayload(payload)}`;
}

export function playbackPath(rawUrl: string) {
  const path = signMediaUrl(rawUrl);
  return /\.m3u8(?:$|\?)/i.test(rawUrl) ? `${path}?hls=1` : path;
}

export function readMediaToken(token: string, now = Date.now()) {
  const decoded = safeDecode(token);
  const split = decoded.split("~");
  if (split.length !== 2) return "";
  const [payload, sig] = split;
  const expected = signPayload(payload);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return "";
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    if (typeof parsed.u !== "string" || typeof parsed.e !== "number" || parsed.e < now) return "";
    return parsed.u;
  } catch {
    return "";
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isBlockedIp(address: string) {
  const ip = address.toLowerCase();
  const mapped = ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : "";
  const v4 = mapped.includes(".") ? mapped : ip.includes(":") ? "" : ip;
  if (!v4) {
    if (ip === "::1" || ip === "::") return true;
    if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(ip)) return true;
    if (ip.startsWith("ff")) return true;
    return false;
  }
  const parts = v4.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export async function publicHttpsUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalid("地址不正确");
  }
  if (url.protocol !== "https:" || url.username || url.password) throw invalid("地址不正确");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal") {
    throw invalid("地址不正确");
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true, verbatim: true })).map((item) => item.address);
  if (!addresses.length || addresses.some((address) => isBlockedIp(address))) throw invalid("地址不正确");
  return url;
}

function rewriteTarget(value: string, base: string) {
  try {
    const absolute = new URL(value, base);
    if (absolute.protocol !== "https:") return value;
    return signMediaUrl(absolute.toString());
  } catch {
    return value;
  }
}

export function rewritePlaylist(body: string, base: string) {
  return body
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      if (line.startsWith("#")) {
        return line.replace(/\bURI=(?:"([^"]+)"|'([^']+)')/g, (match, doubleQuoted: string | undefined, singleQuoted: string | undefined) => {
          const uri = doubleQuoted || singleQuoted || "";
          const quote = match.startsWith('URI="') ? '"' : "'";
          return `URI=${quote}${rewriteTarget(uri, base)}${quote}`;
        });
      }
      return rewriteTarget(line.trim(), base);
    })
    .join("\n");
}

export async function fetchMedia(raw: string, range: string | null) {
  let current = await publicHttpsUrl(raw);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      headers: {
        "User-Agent": UPSTREAM_UA,
        Referer: "https://dsystv.com/",
        Accept: "*/*",
        ...(range ? { Range: range } : {}),
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw upstream();
      current = await publicHttpsUrl(new URL(location, current).toString());
      continue;
    }
    if (response.status !== 200 && response.status !== 206) throw upstream();
    return { response, url: current };
  }
  throw upstream();
}

export async function openMedia(response: Response, url: URL) {
  const type = response.headers.get("content-type") || "";
  const declared = /mpegurl|m3u8/i.test(type) || url.pathname.toLowerCase().endsWith(".m3u8");
  const body = response.body;
  if (!body) throw upstream();
  const reader = body.getReader();
  const first = await reader.read();
  const head = first.value || new Uint8Array();
  const preview = Buffer.from(head.subarray(0, 16)).toString("utf8");
  const playlist = declared || preview.startsWith("#EXTM3U");
  if (!playlist) {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (head.byteLength) controller.enqueue(head);
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            if (chunk.value) controller.enqueue(chunk.value);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        return reader.cancel();
      },
    });
    return { kind: "file" as const, stream, type: type || "application/octet-stream", status: response.status, headers: response.headers };
  }
  const chunks = [head];
  let total = head.byteLength;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    if (!chunk.value) continue;
    total += chunk.value.byteLength;
    if (total > PLAYLIST_LIMIT) {
      await reader.cancel();
      throw upstream();
    }
    chunks.push(chunk.value);
  }
  return { kind: "playlist" as const, text: Buffer.concat(chunks).toString("utf8"), url };
}
