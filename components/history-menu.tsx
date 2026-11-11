"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HISTORY_EVENT, episodeLabel, formatClock, readHistory, type HistoryItem } from "@/lib/history";
import { playHref } from "@/lib/paths";
import { beginNavigation } from "./navigation-progress";
import { IconHistory } from "./icons";

const PREVIEW = 5;

export function HistoryMenu() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hoverable, setHoverable] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(readHistory());
    refresh();
    window.addEventListener(HISTORY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(HISTORY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverable(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!hoverable && rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [hoverable, open]);

  const preview = items.slice(0, PREVIEW);

  function openItem(item: HistoryItem) {
    setOpen(false);
    beginNavigation();
    router.push(item.playId ? playHref(item.id, item.playId) : `/play/${item.id}`);
  }

  return (
    <div
      className="history-menu relative order-3 shrink-0 lg:order-4"
      ref={rootRef}
      onMouseEnter={() => {
        if (hoverable) setOpen(true);
      }}
      onMouseLeave={() => {
        if (hoverable) setOpen(false);
      }}
    >
      <button
        className="history-icon"
        type="button"
        aria-label="播放记录"
        aria-expanded={open}
        onClick={() => {
          if (!hoverable) setOpen((value) => !value);
        }}
      >
        <IconHistory />
      </button>
      {open ? (
        <div className="history-panel">
          <div className="history-card" role="region" aria-label="最近播放">
            {preview.length ? (
              <ul>
                {preview.map((item) => {
                  const ratio = item.duration > 0 ? Math.min(1, item.progress / item.duration) : 0;
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => openItem(item)}>
                        <HistoryCover item={item} />
                        <span className="history-copy">
                          <span className="history-title">{item.title || "未命名"}</span>
                          <span className="history-episode">{episodeLabel(item.episode)}</span>
                          <span className="history-progress" aria-hidden="true">
                            <span style={{ width: `${ratio * 100}%` }} />
                          </span>
                          <span className="history-time">
                            {formatClock(item.progress)}
                            {item.duration > 0 ? ` / ${formatClock(item.duration)}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="history-empty">还没有播放记录</p>
            )}
            <Link className="history-more" href="/history" onClick={() => setOpen(false)}>
              查看更多
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HistoryCover({ item, large = false }: { item: Pick<HistoryItem, "title" | "cover">; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = item.cover && !failed ? item.cover : "";
  const frame = large ? "history-cover w-[54px]" : "history-cover w-[42px]";
  return src ? (
    // Poster hosts vary per title, so the browser loads the stored address directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img className={frame} src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  ) : (
    <span className={`${frame} block`} aria-hidden="true" />
  );
}
