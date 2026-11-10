"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog";
import type { Card } from "@/lib/parse";
import { IconChevronRight, IconRefresh } from "./icons";
import { useApi } from "./use-api";

interface RankData {
  rank: { title: string; list: Card[] };
}

function aside(card: Card) {
  return card.vod_remarks || card.vod_douban_score || "";
}

function RankPanel({ typeId, name }: { typeId: string; name: string }) {
  const { status, data, error, retry } = useApi<RankData>(`/api/channels/${encodeURIComponent(typeId)}`);
  const list = data?.rank.list ?? [];
  const title = (data?.rank.title || `${name}排行榜`).replace(/^TOP\s*/i, "");

  return (
    <section className="rank-panel">
      <div className="rank-head">
        <span className="rank-top">TOP</span>
        <h2>{title}</h2>
        <Link href={`/list?typeId=${typeId}&area=${encodeURIComponent("大陆")}`} aria-label="更多" title="更多">
          <IconChevronRight size={16} />
        </Link>
      </div>
      {status === "loading" ? (
        <div className="rank-skel" aria-busy="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ) : null}
      {status === "error" ? (
        <p className="rank-empty">
          {error.message}
          {error.retryable ? (
            <button type="button" aria-label="重试" title="重试" onClick={retry}>
              <IconRefresh />
            </button>
          ) : null}
        </p>
      ) : null}
      {status === "ready" && list.length === 0 ? <p className="rank-empty">这个榜单暂时没有影片</p> : null}
      {status === "ready" && list.length > 0 ? (
        <ol className="rank-list">
          {list.map((card, index) => (
            <li key={card.id}>
              <Link href={`/play/${card.id}`}>
                <span className={index < 3 ? "rank-no hot" : "rank-no"}>{index + 1}</span>
                <span className="rank-name">{card.vod_name}</span>
                {aside(card) ? <span className="rank-note">{aside(card)}</span> : null}
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function RankView() {
  return (
    <div>
      <div className="page-head">
        <h1>排行榜</h1>
      </div>
      <div className="rank-board">
        {CATEGORIES.map((item) => (
          <RankPanel key={item.type_id} typeId={item.type_id} name={item.type_name} />
        ))}
      </div>
    </div>
  );
}
