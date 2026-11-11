export interface LineMeasure {
  status: "available" | "restricted" | "offline";
  latencyMs: number;
  kbps: number;
}

const TTL = 6 * 60 * 60 * 1000;
const SAMPLE = 32 * 1024;

function cacheKey(playId: string) {
  return `luoxue-line-speed:${playId}`;
}

export function readLineMeasure(playId: string): LineMeasure | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(playId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LineMeasure & { at?: number };
    if (!parsed?.status || !parsed.at || Date.now() - parsed.at > TTL) return null;
    return { status: parsed.status, latencyMs: parsed.latencyMs, kbps: parsed.kbps };
  } catch {
    return null;
  }
}

function writeLineMeasure(playId: string, measure: LineMeasure) {
  try {
    sessionStorage.setItem(cacheKey(playId), JSON.stringify({ ...measure, at: Date.now() }));
  } catch {
    // The speed label still updates for this visit when storage is unavailable.
  }
}

function absoluteUrl(value: string, base: string) {
  try {
    return new URL(value, new URL(base, location.href)).toString();
  } catch {
    return "";
  }
}

async function timedFetch(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store", credentials: "omit" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchManifest(url: string) {
  const started = Date.now();
  try {
    const response = await timedFetch(url, 8000, { mode: "cors" });
    if (!response.ok) {
      const error = new Error("manifest") as Error & { offline?: boolean };
      error.offline = response.status === 404 || response.status === 410;
      throw error;
    }
    const body = await response.text();
    if (!body.includes("#EXTM3U")) return { body: "", elapsed: Date.now() - started, direct: true };
    return { body, elapsed: Date.now() - started, direct: false };
  } catch (error) {
    if (error && typeof error === "object" && "offline" in error) throw error;
    try {
      await timedFetch(url, 8000, { mode: "no-cors" });
      return { body: "", elapsed: Date.now() - started, direct: false, limited: true };
    } catch {
      throw error;
    }
  }
}

function firstVariant(body: string, base: string) {
  const lines = body.split(/\r?\n/);
  let expect = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      expect = true;
      continue;
    }
    if (expect && !line.startsWith("#")) return absoluteUrl(line, base);
  }
  return "";
}

function firstSegment(body: string, base: string) {
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (line && !line.startsWith("#")) return absoluteUrl(line, base);
  }
  return "";
}

async function sample(url: string) {
  const started = Date.now();
  const response = await timedFetch(url, 9000, { mode: "cors" });
  if (!response.ok && response.status !== 206) {
    const error = new Error("sample") as Error & { offline?: boolean };
    error.offline = response.status === 404 || response.status === 410;
    throw error;
  }
  const reader = response.body?.getReader();
  if (!reader) return { bytes: 0, elapsed: Date.now() - started };
  let bytes = 0;
  while (bytes < SAMPLE) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value?.byteLength || 0;
  }
  await reader.cancel().catch(() => undefined);
  if (bytes <= 0) {
    const error = new Error("empty") as Error & { offline?: boolean };
    error.offline = true;
    throw error;
  }
  return { bytes: Math.min(bytes, SAMPLE), elapsed: Math.max(1, Date.now() - started) };
}

async function classify(url: string): Promise<LineMeasure> {
  const started = Date.now();
  try {
    const manifest = await fetchManifest(url);
    if ("limited" in manifest && manifest.limited) return { status: "restricted", latencyMs: manifest.elapsed, kbps: 0 };
    let segment = url;
    if (!manifest.direct) {
      const variant = firstVariant(manifest.body, url);
      const playlist = variant ? await fetchManifest(variant) : manifest;
      if ("limited" in playlist && playlist.limited) return { status: "restricted", latencyMs: Date.now() - started, kbps: 0 };
      segment = firstSegment(playlist.body, variant || url);
    }
    if (!segment) return { status: "offline", latencyMs: Date.now() - started, kbps: 0 };
    const taken = await sample(segment);
    return { status: "available", latencyMs: Date.now() - started, kbps: Math.round((taken.bytes * 8) / Math.max(1, taken.elapsed)) };
  } catch (error) {
    const offline = Boolean(error && typeof error === "object" && "offline" in error && error.offline);
    return { status: offline ? "offline" : "restricted", latencyMs: Math.min(30000, Date.now() - started), kbps: 0 };
  }
}

export async function measureLine(playId: string) {
  const cached = readLineMeasure(playId);
  if (cached) return cached;
  const response = await fetch(`/api/play?playId=${encodeURIComponent(playId)}`);
  const body = (await response.json()) as { ok?: boolean; data?: { parse?: number; url?: string } };
  const url = body.data?.url;
  if (!body.ok || body.data?.parse !== 0 || !url) return { status: "offline" as const, latencyMs: 0, kbps: 0 };
  const measured = await classify(url);
  writeLineMeasure(playId, measured);
  return measured;
}

export function lineScore(measure: LineMeasure) {
  const throughput = Math.max(0, measure.kbps);
  const latency = Math.max(0, measure.latencyMs);
  return Math.min(1, throughput / 5000) * 60 + (1 - Math.min(1, latency / 10000)) * 40;
}
