export interface HistoryItem {
  id: string;
  title: string;
  cover: string;
  line: string;
  episode: string;
  playId: string;
  progress: number;
  duration: number;
  updatedAt: number;
}

const KEY = "luoxue-history";
const MAX = 100;
export const HISTORY_EVENT = "luoxue:history";

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

function isItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as HistoryItem;
  return typeof item.id === "string" && item.id.length > 0 && typeof item.playId === "string" && typeof item.updatedAt === "number";
}

export function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isItem)
      .map((item) => ({
        id: item.id,
        title: String(item.title || ""),
        cover: String(item.cover || ""),
        line: String(item.line || ""),
        episode: String(item.episode || ""),
        playId: item.playId,
        progress: Number.isFinite(item.progress) ? Math.max(0, item.progress) : 0,
        duration: Number.isFinite(item.duration) ? Math.max(0, item.duration) : 0,
        updatedAt: item.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function findHistory(id: string) {
  return readHistory().find((item) => item.id === id) || null;
}

function writeAll(items: HistoryItem[]) {
  const next = [...items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  emit();
  return next;
}

export function saveProgress(item: Omit<HistoryItem, "updatedAt">) {
  if (typeof window === "undefined" || !item.id) return readHistory();
  const next = readHistory().filter((entry) => entry.id !== item.id);
  next.unshift({
    id: item.id,
    title: item.title,
    cover: item.cover,
    line: item.line,
    episode: item.episode,
    playId: item.playId,
    progress: Number.isFinite(item.progress) ? Math.max(0, item.progress) : 0,
    duration: Number.isFinite(item.duration) ? Math.max(0, item.duration) : 0,
    updatedAt: Date.now(),
  });
  return writeAll(next);
}

export function removeHistory(id: string) {
  if (typeof window === "undefined") return [];
  return writeAll(readHistory().filter((item) => item.id !== id));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  emit();
}

function intentKey(id: string) {
  return `luoxue-play-intent:${id}`;
}

export function readPlayIntent(id: string) {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(intentKey(id)) || "";
  } catch {
    return "";
  }
}

export function writePlayIntent(id: string, playId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(intentKey(id), playId);
  } catch {
    // Continuing still works when the tab cannot store the choice.
  }
}

export function episodeLabel(episode: string) {
  if (!episode) return "继续播放";
  return episode.startsWith("第") ? `看到${episode}` : `看到 ${episode}`;
}

export function formatClock(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remain = value % 60;
  const text = `${String(minutes).padStart(hours ? 2 : 1, "0")}:${String(remain).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${text}` : text;
}
