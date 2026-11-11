import { lineScore, type LineMeasure } from "./line-speed";

export interface ResumeSource {
  name: string;
  episodes: { name: string; playId: string }[];
}

export interface ResumeRecord {
  line: string;
  episode: string;
  playId: string;
  progress: number;
}

type Speed = LineMeasure | "pending";

export type ResumeChoice = { status: "wait" } | { status: "play"; playId: string; startAt: number };

export function episodeIndex(playId: string) {
  const match = playId.match(/^ep_\d+_\d+_(\d+)$/);
  return match ? Number(match[1]) : null;
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, "zh-CN", { numeric: true, sensitivity: "base" });
}

export function speedsReady(sources: ResumeSource[], speeds: Record<string, Speed | undefined>) {
  return sources.every((source) => !source.episodes.length || (speeds[source.name] && speeds[source.name] !== "pending"));
}

export function bestLineName(sources: ResumeSource[], speeds: Record<string, Speed | undefined>) {
  let available = { name: "", score: -1 };
  let restricted = { name: "", score: -1 };
  for (const source of [...sources].sort(byName)) {
    const measure = speeds[source.name];
    if (!measure || measure === "pending" || !source.episodes.length) continue;
    const score = lineScore(measure);
    if (measure.status === "available" && score > available.score) available = { name: source.name, score };
    if (measure.status === "restricted" && score > restricted.score) restricted = { name: source.name, score };
  }
  if (available.name) return available.name;
  if (restricted.name) return restricted.name;
  return [...sources].filter((source) => source.episodes.length).sort(byName)[0]?.name || "";
}

function bestPlayId(sources: ResumeSource[], speeds: Record<string, Speed | undefined>) {
  const name = bestLineName(sources, speeds);
  return sources.find((source) => source.name === name)?.episodes[0]?.playId || "";
}

function play(playId: string, startAt = 0): ResumeChoice {
  return { status: "play", playId, startAt: Math.max(0, startAt) };
}

export function chooseResume(sources: ResumeSource[], record: ResumeRecord | null, speeds: Record<string, Speed | undefined>): ResumeChoice {
  const playable = sources.filter((source) => source.episodes.length);
  if (!playable.length) return { status: "wait" };
  if (!record) {
    if (!speedsReady(playable, speeds)) return { status: "wait" };
    const playId = bestPlayId(playable, speeds);
    return playId ? play(playId) : { status: "wait" };
  }
  const line = playable.find((source) => source.name === record.line);
  if (!line) {
    if (!speedsReady(playable, speeds)) return { status: "wait" };
    const playId = bestPlayId(playable, speeds);
    return playId ? play(playId) : { status: "wait" };
  }
  const exact = line.episodes.find((episode) => episode.playId === record.playId);
  if (exact) return play(exact.playId, record.progress);
  const index = episodeIndex(record.playId);
  if (index != null) {
    const sameNumber = line.episodes.find((episode) => episodeIndex(episode.playId) === index);
    if (sameNumber) return play(sameNumber.playId, record.progress);
    const highest = line.episodes.reduce((max, episode) => Math.max(max, episodeIndex(episode.playId) ?? -1), -1);
    if (index > highest) return play(line.episodes[line.episodes.length - 1].playId);
  }
  const named = line.episodes.find((episode) => episode.name && episode.name === record.episode);
  if (named) return play(named.playId, record.progress);
  if (!speedsReady(playable, speeds)) return { status: "wait" };
  const playId = bestPlayId(playable, speeds);
  return playId ? play(playId) : { status: "wait" };
}
