"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HISTORY_EVENT, clearHistory, episodeLabel, formatClock, readHistory, removeHistory, type HistoryItem } from "@/lib/history";
import { playHref } from "@/lib/paths";
import { HistoryCover } from "./history-menu";
import { pageHead, pageTitle } from "@/lib/ui";
import { Status } from "./media";

export function HistoryView() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

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

  return (
    <div>
      <div className={pageHead}>
        <h1 className={pageTitle}>播放记录</h1>
        {items && items.length ? (
          <button
            className="history-clear"
            type="button"
            onClick={() => {
              if (window.confirm("清空全部播放记录？")) clearHistory();
            }}
          >
            清空
          </button>
        ) : null}
      </div>
      {items && items.length === 0 ? (
        <Status title="还没有播放记录" detail="看过的影片会出现在这里" />
      ) : null}
      {items && items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {items.map((item) => {
            const ratio = item.duration > 0 ? Math.min(1, item.progress / item.duration) : 0;
            const href = item.playId ? playHref(item.id, item.playId) : `/play/${item.id}`;
            return (
              <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-line bg-elev" key={item.id}>
                <Link className="grid grid-cols-[54px_minmax(0,1fr)] items-center gap-2.5 rounded-lg p-2 hover:bg-soft" href={href}>
                  <HistoryCover item={item} large />
                  <span className="history-copy">
                    <span className="history-title text-base">{item.title || "未命名"}</span>
                    <span className="history-episode">{episodeLabel(item.episode)}</span>
                    <span className="history-progress" aria-hidden="true">
                      <span style={{ width: `${ratio * 100}%` }} />
                    </span>
                    <span className="history-time">
                      {formatClock(item.progress)}
                      {item.duration > 0 ? ` / ${formatClock(item.duration)}` : ""}
                    </span>
                  </span>
                </Link>
                <button className="history-delete" type="button" onClick={() => removeHistory(item.id)}>
                  删除
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
