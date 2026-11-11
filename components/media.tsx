"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { beginNavigation } from "./navigation-progress";
import { useState, type FormEvent } from "react";
import { posterRemark } from "@/lib/display";
import { posterGrid } from "@/lib/ui";
import type { Card } from "@/lib/parse";
import { IconChevronLeft, IconChevronRight, IconEnter, IconRefresh } from "./icons";

export function Status({
  title,
  detail,
  retry,
}: {
  title: string;
  detail?: string;
  retry?: () => void;
}) {
  return (
    <div className="state">
      <img src="/mark.svg" alt="" width={28} height={28} />
      <h2>{title}</h2>
      {detail ? <p>{detail}</p> : null}
      {retry ? (
        <button className="retry" type="button" aria-label="重试" title="重试" onClick={retry}>
          <IconRefresh />
        </button>
      ) : null}
    </div>
  );
}

export function PageFailure({ title, detail, retryable }: { title: string; detail?: string; retryable?: boolean }) {
  const router = useRouter();
  return <Status title={title} detail={detail} retry={retryable ? () => router.refresh() : undefined} />;
}

export function LoadingBlock({ kind = "grid" }: { kind?: "grid" | "home" | "rows" }) {
  if (kind === "home") {
    return (
      <div>
        <div className="skeleton-banner" />
        <div className={`${posterGrid} mt-[22px]`}>
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton-card" key={index} />
          ))}
        </div>
      </div>
    );
  }
  if (kind === "rows") {
    return (
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:gap-x-7 xl:gap-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-row" key={index} />
        ))}
      </div>
    );
  }
  return (
    <div className={posterGrid} aria-busy="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div className="skeleton-card" key={index} />
      ))}
    </div>
  );
}

export function Poster({ card, meta }: { card: Card; meta?: string }) {
  return (
    <Link className="card" href={`/play/${card.id}`}>
      <PosterFace card={card} />
      <p className="card-title">{card.vod_name}</p>
      {meta ? <p className="card-meta">{meta}</p> : null}
    </Link>
  );
}

export function PosterFace({ card }: { card: Pick<Card, "vod_name" | "vod_pic" | "vod_remarks" | "vod_douban_score"> }) {
  const [failed, setFailed] = useState(false);
  const remark = posterRemark(card.vod_remarks);
  const missing = !card.vod_pic || failed;
  return (
    <div className="poster">
      {missing ? (
        <span className="poster-fallback">{card.vod_name}</span>
      ) : (
        // Poster hosts vary per title, so the browser loads the address from the API directly.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.vod_pic} alt={card.vod_name} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
      {card.vod_douban_score ? <span className="badge score">{card.vod_douban_score}</span> : null}
      {remark ? <span className="badge note">{remark}</span> : null}
    </div>
  );
}

function pageItems(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const keep = new Set<number>([1, pageCount]);
  const nearStart = page <= 4;
  const nearEnd = page >= pageCount - 3;
  const start = nearStart ? 1 : nearEnd ? pageCount - 4 : page - 2;
  const end = nearStart ? 5 : nearEnd ? pageCount : page + 2;
  for (let item = start; item <= end; item += 1) keep.add(item);
  const sorted = [...keep].filter((item) => item >= 1 && item <= pageCount).sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  for (const item of sorted) {
    const prev = items.at(-1);
    if (typeof prev === "number" && item - prev > 1) items.push("gap");
    items.push(item);
  }
  return items;
}

export function Pager({
  page,
  pageCount,
  total,
  totalExact,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  total?: number;
  totalExact?: boolean;
  hrefFor: (page: number) => string;
}) {
  const router = useRouter();
  const [jump, setJump] = useState("");
  const items = pageItems(page, pageCount);

  function go(event: FormEvent) {
    event.preventDefault();
    const next = Number(jump);
    if (!Number.isInteger(next) || next < 1 || next > pageCount || next === page) return;
    setJump("");
    beginNavigation();
    router.push(hrefFor(next));
  }

  return (
    <nav className="pager" aria-label="分页">
      <span className="summary">
        {totalExact && typeof total === "number" ? `共 ${total} 部 · ` : ""}第 {page} / {pageCount} 页
      </span>
      {pageCount > 1 ? (
        page > 1 ? (
          <Link className="step" href={hrefFor(page - 1)} aria-label="上一页" title="上一页">
            <IconChevronLeft size={16} />
          </Link>
        ) : (
          <span className="off step" aria-hidden="true">
            <IconChevronLeft size={16} />
          </span>
        )
      ) : null}
      {items.map((item, index) =>
        item === "gap" ? (
          <span className="gap" key={`gap-${index}`}>
            …
          </span>
        ) : item === page ? (
          <span className="current" key={item}>
            {item}
          </span>
        ) : (
          <Link href={hrefFor(item)} key={item}>
            {item}
          </Link>
        ),
      )}
      {pageCount > 1 ? (
        page < pageCount ? (
          <Link className="step" href={hrefFor(page + 1)} aria-label="下一页" title="下一页">
            <IconChevronRight size={16} />
          </Link>
        ) : (
          <span className="off step" aria-hidden="true">
            <IconChevronRight size={16} />
          </span>
        )
      ) : null}
      {pageCount > 1 ? (
        <form className="pager-jump" onSubmit={go}>
          跳至
          <input aria-label="页码" inputMode="numeric" value={jump} onChange={(event) => setJump(event.target.value.replace(/\D/g, ""))} />
          页
          <button type="submit" aria-label="确定" title="确定">
            <IconEnter />
          </button>
        </form>
      ) : null}
    </nav>
  );
}
