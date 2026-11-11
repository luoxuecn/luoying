"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { findHistory, readPlayIntent, saveProgress, writePlayIntent } from "@/lib/history";
import { shownFact } from "@/lib/display";
import { playHref } from "@/lib/paths";
import { playDetail, playLayout, playLines, playSide, playStage, playTitle, playerFrame } from "@/lib/ui";
import { beginNavigation } from "./navigation-progress";
import { IconChevronLeft, IconChevronRight, IconSortDown, IconSortUp } from "./icons";
import { lineScore, measureLine, type LineMeasure } from "./line-speed";
import { Player, PlayerWait, type PlayReady } from "./player";
import { chooseResume, episodeIndex } from "./resume";
import { PosterFace, Status } from "./media";

interface Episode {
  name: string;
  playId: string;
}

interface Source {
  name: string;
  episodes: Episode[];
}

export interface Detail {
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
  type_name?: string;
  other?: string;
  vod_content?: string;
  vod_play_sources: Source[];
}

export function PlayView({ id, playId, data, source }: { id: string; playId: string; data: Detail; source: PlayReady | null }) {
  const router = useRouter();
  const sources = useMemo(() => [...data.vod_play_sources].sort(byLineName), [data.vod_play_sources]);
  const [speeds, setSpeeds] = useState<Record<string, LineMeasure | "pending">>(() =>
    Object.fromEntries(sources.filter((item) => item.episodes[0]).map((item) => [item.name, "pending"])),
  );
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const settled = useRef(false);
  const filmId = useRef(id);
  if (filmId.current !== id) {
    filmId.current = id;
    settled.current = false;
  }
  const current = sources.flatMap((item) => item.episodes).find((episode) => episode.playId === playId);

  const remember = useCallback(
    (nextPlayId: string, progress: number, duration: number) => {
      const line = sources.find((item) => item.episodes.some((episode) => episode.playId === nextPlayId));
      const episode = line?.episodes.find((item) => item.playId === nextPlayId);
      if (!line || !episode) return;
      progressRef.current = progress;
      durationRef.current = duration;
      saveProgress({
        id,
        title: data.vod_name,
        cover: data.vod_pic || "",
        line: line.name,
        episode: episode.name,
        playId: nextPlayId,
        progress,
        duration,
      });
    },
    [data.vod_name, data.vod_pic, id, sources],
  );

  useLayoutEffect(() => {
    if (settled.current) return;
    const intent = readPlayIntent(id);
    if (playId && intent === playId) {
      settled.current = true;
      return;
    }
    if (playId && !findHistory(id)) {
      settled.current = true;
      return;
    }
    const decision = chooseResume(sources, findHistory(id), speeds);
    if (decision.status === "wait") return;
    settled.current = true;
    writePlayIntent(id, decision.playId);
    if (decision.playId !== playId) {
      beginNavigation();
      router.replace(playHref(id, decision.playId));
    }
  }, [id, playId, router, sources, speeds]);
  const title = current ? `${data.vod_name} · ${current.name}` : data.vod_name;
  const facts = [
    ["主演", shownFact(people(data.vod_actor))],
    ["导演", shownFact(people(data.vod_director))],
    ["地区", shownFact(data.vod_area)],
    ["类型", shownFact(data.type_name)],
    ["语言", shownFact(data.vod_lang)],
    ["年份", shownFact(data.vod_year)],
    ["豆瓣", shownFact(data.vod_douban_score)],
    ["又名", shownFact(people(data.other))],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  function open(nextPlayId: string) {
    if (!nextPlayId || nextPlayId === playId) return;
    const sameEpisode = episodeIndex(playId) != null && episodeIndex(playId) === episodeIndex(nextPlayId);
    remember(nextPlayId, sameEpisode ? progressRef.current : 0, sameEpisode ? durationRef.current : 0);
    writePlayIntent(id, nextPlayId);
    settled.current = true;
    beginNavigation();
    router.push(playHref(id, nextPlayId));
  }

  const onProgress = useCallback(
    (progress: number, duration: number) => {
      if (!settled.current) return;
      remember(playId, progress, duration);
    },
    [playId, remember],
  );

  return (
    <div className={playLayout}>
      <div className={playStage}>
        {playId ? <Player playId={playId} videoId={id} initial={source} onProgress={onProgress} /> : <PlayerWait />}
        <h1 className={playTitle}>{title}</h1>
        <div className={playSide}>
          {sources.length ? (
            <EpisodePicker sources={sources} playId={playId} speeds={speeds} onSpeeds={setSpeeds} onOpen={open} />
          ) : (
            <Status title="没有可播放的剧集" />
          )}
        </div>
      </div>
      <div className={playDetail}>
        <div className="play-meta mt-[18px] grid grid-cols-[104px_1fr] items-start gap-3 sm:grid-cols-[168px_1fr] sm:gap-[18px]">
          <PosterFace card={data} />
          <div className="play-copy">
            <dl className="search-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}：</dt>
                  <dd className={label === "主演" ? "clamp" : undefined}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        {data.vod_content ? <Plot text={data.vod_content} /> : null}
      </div>
    </div>
  );
}

export function PlaySkeleton() {
  return (
    <div className={playLayout} aria-busy="true" aria-label="正在加载影片">
      <div className={playStage}>
        <PlayerWait />
        <span className={playTitle}>
          <span className="play-skel title" />
        </span>
        <div className={playSide}>
          <section className={playLines}>
            <div className="section-head">
              <span className="play-skel head" />
            </div>
            <div className="play-skel-lines">
              {Array.from({ length: 4 }, (_, index) => (
                <span className="play-skel" key={index} />
              ))}
            </div>
            <div className="section-head episode-head">
              <span className="play-skel head" />
            </div>
            <div className="episodes" style={{ "--ep-units": 3 } as CSSProperties}>
              {Array.from({ length: 12 }, (_, index) => (
                <span className="play-skel" key={index} />
              ))}
            </div>
          </section>
        </div>
      </div>
      <div className={playDetail}>
        <div className="play-meta mt-[18px] grid grid-cols-[104px_1fr] items-start gap-3 sm:grid-cols-[168px_1fr] sm:gap-[18px]">
          <div className="poster play-skel" />
          <div className="play-copy">
            {Array.from({ length: 6 }, (_, index) => (
              <span className="play-skel fact" key={index} />
            ))}
          </div>
        </div>
        <span className="play-skel plot" />
        <span className="play-skel plot short" />
      </div>
    </div>
  );
}

function Plot({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const tailCount = Math.min(2, text.length);

  useEffect(() => {
    const node = ref.current;
    if (!node || open) return;
    const check = () => setOverflow(node.scrollHeight > node.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, text]);

  return (
    <div className="plot">
      <p ref={ref} className={open ? "plot-text" : "plot-text clamped"}>
        {open ? (
          <>
            {text.slice(0, -tailCount)}
            <span className="plot-tail">
              {text.slice(-tailCount)}
              {overflow ? (
                <button type="button" className="plot-fold" onClick={() => setOpen(false)}>
                  收起
                </button>
              ) : null}
            </span>
          </>
        ) : (
          text
        )}
      </p>
      {!open && overflow ? (
        <button type="button" className="plot-more" aria-expanded={false} onClick={() => setOpen(true)}>
          展开
        </button>
      ) : null}
    </div>
  );
}

function byLineName(a: Source, b: Source) {
  return a.name.localeCompare(b.name, "zh-CN", { numeric: true, sensitivity: "base" });
}

function people(value?: string) {
  return value?.replace(/[,，]\s*/g, " ").replace(/\s+/g, " ").trim() || "";
}

function textUnits(text: string) {
  let units = 0;
  for (const char of text) units += /[0-9A-Za-z]/.test(char) ? 0.5 : 1;
  return units || 1;
}

const EPISODE_PAGE = 30;

function matchingEpisode(from: Episode[], to: Episode[], playId: string) {
  if (!to.length) return undefined;
  const current = from.find((episode) => episode.playId === playId);
  const last = to[to.length - 1].playId;
  if (!current) return last;
  const key = episodeIndex(current.playId);
  if (key != null) {
    const found = to.find((episode) => episodeIndex(episode.playId) === key);
    if (found) return found.playId;
  }
  const named = to.find((episode) => episode.name === current.name);
  return named ? named.playId : last;
}

function pageFor(episodes: Episode[], playId: string, reversed: boolean) {
  const index = episodes.findIndex((episode) => episode.playId === playId);
  const ordered = index < 0 ? 0 : reversed ? episodes.length - 1 - index : index;
  return Math.floor(ordered / EPISODE_PAGE);
}

function rangeLabel(index: number, count: number) {
  const start = index * EPISODE_PAGE + 1;
  const end = start + count - 1;
  return start === end ? String(start) : `${start}-${end}`;
}

function EpisodePicker({
  sources,
  playId,
  speeds,
  onSpeeds,
  onOpen,
}: {
  sources: Source[];
  playId: string;
  speeds: Record<string, LineMeasure | "pending">;
  onSpeeds: (speeds: Record<string, LineMeasure | "pending"> | ((current: Record<string, LineMeasure | "pending">) => Record<string, LineMeasure | "pending">)) => void;
  onOpen: (playId: string) => void;
}) {
  const [reversed, setReversed] = useState(false);
  const active = sources.find((source) => source.episodes.some((episode) => episode.playId === playId)) || sources[0];
  const units = sources.reduce((max, source) => source.episodes.reduce((inner, episode) => Math.max(inner, textUnits(episode.name)), max), 1);
  const episodes = reversed ? [...active.episodes].reverse() : active.episodes;
  const pageCount = Math.max(1, Math.ceil(episodes.length / EPISODE_PAGE));
  const [page, setPage] = useState(() => pageFor(active.episodes, playId, false));
  const syncKey = `${active.name}|${playId}|${reversed}`;
  const [synced, setSynced] = useState(syncKey);
  if (synced !== syncKey) {
    setSynced(syncKey);
    setPage(pageFor(active.episodes, playId, reversed));
  }
  const current = Math.min(page, pageCount - 1);
  const visible = episodes.slice(current * EPISODE_PAGE, current * EPISODE_PAGE + EPISODE_PAGE);
  const pages = Array.from({ length: pageCount }, (_, index) => episodes.slice(index * EPISODE_PAGE, index * EPISODE_PAGE + EPISODE_PAGE));
  return (
    <section className={playLines}>
      <div className="section-head">
        <h2>播放线路</h2>
      </div>
      <LineRow sources={sources} active={active} playId={playId} speeds={speeds} onSpeeds={onSpeeds} onOpen={onOpen} />
      <div className="section-head episode-head">
        <h2>选集</h2>
        <div className="episode-tools">
          <span className="faint">{active.episodes.length} 集</span>
          <button className={reversed ? "episode-order on" : "episode-order"} type="button" aria-pressed={reversed} aria-label={reversed ? "正序" : "倒序"} title={reversed ? "正序" : "倒序"} onClick={() => setReversed((value) => !value)}>
            {reversed ? <IconSortUp /> : <IconSortDown />}
          </button>
        </div>
      </div>
      {pageCount > 1 ? <PageRow pages={pages} current={current} onPick={setPage} /> : null}
      <EpisodeGrid key={current} episodes={visible} playId={playId} units={units} onOpen={onOpen} />
    </section>
  );
}

function PageRow({ pages, current, onPick }: { pages: Episode[][]; current: number; onPick: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false, wide: true });

  useEffect(() => {
    const node = ref.current;
    const active = node?.querySelector<HTMLElement>(".episode-page.on");
    if (!node || !active) return;
    const left = active.offsetLeft - (node.clientWidth - active.offsetWidth) / 2;
    node.scrollTo({ left: Math.max(0, left) });
  }, [current, pages.length]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const max = node.scrollWidth - node.clientWidth;
      const overflow = max > 4;
      setEdges({
        left: overflow && node.scrollLeft > 4,
        right: overflow && node.scrollLeft < max - 4,
        wide: window.matchMedia("(min-width: 1024px)").matches,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pages.length]);

  function move(direction: number) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.6, 140), behavior: "smooth" });
  }

  const reserve = [edges.left ? "reserve-prev" : "", edges.right ? "reserve-next" : ""].filter(Boolean).join(" ");
  const fade = [edges.left ? "fade-left" : "", edges.right ? "fade-right" : ""].filter(Boolean).join(" ");
  return (
    <div className="episode-pages">
      <div className={["episode-page-row", fade, reserve].filter(Boolean).join(" ")}>
        <div className="episode-page-scroller" ref={ref} role="tablist" aria-label="选集分页">
          {pages.map((list, index) => (
            <button className={index === current ? "episode-page on" : "episode-page"} type="button" role="tab" aria-selected={index === current} key={list[0]?.playId || index} onClick={() => onPick(index)}>
              {rangeLabel(index, list.length)}
            </button>
          ))}
        </div>
        {edges.wide && edges.left ? (
          <button className="page-nav prev" type="button" aria-label="向左查看分页" onClick={() => move(-1)}><IconChevronLeft /></button>
        ) : null}
        {edges.wide && edges.right ? (
          <button className="page-nav next" type="button" aria-label="向右查看分页" onClick={() => move(1)}><IconChevronRight /></button>
        ) : null}
      </div>
      {!edges.wide && (edges.left || edges.right) ? <p className="line-hint">左右滑动查看分页</p> : null}
    </div>
  );
}

function lineLabel(measure: LineMeasure | "pending" | undefined, best: boolean) {
  if (!measure || measure === "pending") return { text: "检测中", kind: "wait" };
  if (measure.status === "available" && best) return { text: "优选", kind: "good" };
  if (measure.status === "available") return { text: "良好", kind: "good" };
  if (measure.status === "offline") return { text: "无法连接", kind: "bad" };
  return { text: "连接受限", kind: "bad" };
}

function lineRank(measure: LineMeasure | "pending" | undefined, best: boolean) {
  if (measure && measure !== "pending" && measure.status === "available") return best ? 0 : 1;
  if (!measure || measure === "pending") return 2;
  if (measure.status === "offline") return 4;
  return 3;
}

function LineRow({
  sources,
  active,
  playId,
  speeds,
  onSpeeds,
  onOpen,
}: {
  sources: Source[];
  active: Source;
  playId: string;
  speeds: Record<string, LineMeasure | "pending">;
  onSpeeds: (speeds: Record<string, LineMeasure | "pending"> | ((current: Record<string, LineMeasure | "pending">) => Record<string, LineMeasure | "pending">)) => void;
  onOpen: (playId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false, hint: false });
  const probeKey = sources.map((source) => source.episodes[0]?.playId || "").join("|");

  useEffect(() => {
    let cancelled = false;
    const jobs = sources.flatMap((source) => {
      const id = source.episodes[0]?.playId;
      return id ? [{ name: source.name, playId: id }] : [];
    });
    let cursor = 0;
    async function worker() {
      while (cursor < jobs.length) {
        const job = jobs[cursor];
        cursor += 1;
        if (!job) return;
        const measured = await measureLine(job.playId);
        if (cancelled) return;
        onSpeeds((current) => ({ ...current, [job.name]: measured }));
      }
    }
    void Promise.all([worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [onSpeeds, probeKey, sources]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const max = node.scrollWidth - node.clientWidth;
      const overflow = max > 4;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      setEdges({
        left: wide && overflow && node.scrollLeft > 4,
        right: wide && overflow && node.scrollLeft < max - 4,
        hint: !wide && overflow,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sources]);

  function move(direction: number) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth - 48, 160), behavior: "smooth" });
  }

  const bestName = sources.reduce<{ name: string; score: number }>(
    (best, source) => {
      const measure = speeds[source.name];
      if (!measure || measure === "pending" || measure.status !== "available") return best;
      const score = lineScore(measure);
      return score > best.score ? { name: source.name, score } : best;
    },
    { name: "", score: -1 },
  ).name;
  const ordered = [...sources].sort((a, b) => lineRank(speeds[a.name], a.name === bestName) - lineRank(speeds[b.name], b.name === bestName) || byLineName(a, b));

  const lineUnits = sources.reduce((max, source) => Math.max(max, textUnits(source.name)), 1);
  return (
    <div className="line-row">
      <div className="line-scroller" ref={ref} style={{ "--line-units": lineUnits } as CSSProperties}>
        {ordered.map((source) => {
          const speed = lineLabel(speeds[source.name], source.name === bestName);
          return (
            <button
              className={source.name === active.name ? "line-chip active" : "line-chip"}
              type="button"
              key={source.name}
              onClick={() => {
                if (source.name === active.name) return;
                const next = matchingEpisode(active.episodes, source.episodes, playId);
                if (next) onOpen(next);
              }}
            >
              <span>{source.name}</span>
              <span className={`line-speed ${speed.kind}`}>{speed.text}</span>
            </button>
          );
        })}
      </div>
      {edges.left ? (
        <button className="line-nav prev" type="button" aria-label="向左查看线路" onClick={() => move(-1)}>
          <IconChevronLeft />
        </button>
      ) : null}
      {edges.right ? (
        <button className="line-nav next" type="button" aria-label="向右查看线路" onClick={() => move(1)}>
          <IconChevronRight />
        </button>
      ) : null}
      {edges.hint ? <p className="line-hint">左右滑动查看线路</p> : null}
    </div>
  );
}

function EpisodeGrid({ episodes, playId, units, onOpen }: { episodes: Episode[]; playId: string; units: number; onOpen: (playId: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [pane, setPane] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const font = Number.parseFloat(getComputedStyle(node).fontSize) || 14;
      const size = units * font + 18;
      setFull(size >= node.clientWidth - 1);
      setPane(node.scrollHeight > node.clientHeight + 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [units]);

  const episodeKey = episodes.map((episode) => episode.playId).join("|");
  useEffect(() => {
    const node = ref.current;
    const active = node?.querySelector<HTMLElement>(".episode.active");
    if (!node || !active) return;
    const top = active.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop;
    const bottom = top + active.offsetHeight;
    if (top < node.scrollTop || bottom > node.scrollTop + node.clientHeight) {
      node.scrollTop = Math.max(0, top - 8);
    }
  }, [playId, episodeKey]);

  return (
    <div className={["episodes local-scroll", full ? "stack" : "", pane ? "pane" : ""].filter(Boolean).join(" ")} ref={ref} style={{ "--ep-units": units } as CSSProperties}>
      {episodes.map((episode) => (
        <button className={episode.playId === playId ? "episode active" : "episode"} type="button" key={episode.playId} onClick={() => onOpen(episode.playId)}>
          {episode.name}
        </button>
      ))}
    </div>
  );
}
