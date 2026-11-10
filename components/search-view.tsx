"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Card } from "@/lib/parse";
import { LoadingBlock, Pager, PosterFace, Status } from "./media";
import { useApi } from "./use-api";

interface SearchData {
  page: number;
  pageCount: number;
  total: number;
  totalExact: boolean;
  empty: boolean;
  query: string;
  list: Card[];
}

function names(value?: string) {
  return value?.replace(/[,，]\s*/g, " ").replace(/\s+/g, " ").trim() || "";
}

export function SearchView() {
  const params = useSearchParams();
  const query = (params.get("q") || "").trim();
  const page = params.get("page") || "";
  const path = query ? `/api/search?q=${encodeURIComponent(query)}${page ? `&page=${encodeURIComponent(page)}` : ""}` : null;
  const { status, data, error, retry } = useApi<SearchData>(path);

  function pageHref(nextPage: number) {
    const next = new URLSearchParams();
    next.set("q", query);
    if (nextPage > 1) next.set("page", String(nextPage));
    return `/search?${next.toString()}`;
  }

  return (
    <div>
      <div className="page-head">
        <h1>{query ? `搜索「${query}」` : "搜索"}</h1>
        {status === "ready" && data.totalExact ? <span className="faint">{data.total} 条结果</span> : null}
      </div>
      {!query ? <Status title="输入片名后再搜索" /> : null}
      {query && status === "loading" ? <LoadingBlock kind="rows" /> : null}
      {query && status === "error" ? <Status title="搜索暂时不可用" detail={error.message} retry={error.retryable ? retry : undefined} /> : null}
      {status === "ready" && data.empty ? <Status title="没有找到相关影片" detail="换一个关键词试试" /> : null}
      {status === "ready" && !data.empty ? (
        <>
          <div className="search-list">
            {data.list.map((card) => {
              const facts = [
                ["主演", names(card.vod_actor)],
                ["导演", names(card.vod_director)],
                ["地区", card.vod_area || ""],
                ["类型", card.type_name || ""],
                ["语言", card.vod_lang || ""],
                ["年份", card.vod_year || ""],
                ["豆瓣", card.vod_douban_score && !card.vod_douban_score.includes("暂无") ? card.vod_douban_score : ""],
              ].filter((item): item is [string, string] => Boolean(item[1]));
              return (
                <Link className="search-row" href={`/play/${card.id}`} key={card.id}>
                  <PosterFace card={card} />
                  <div className="search-copy">
                    <h2>{card.vod_name}</h2>
                    <dl className="search-facts">
                      {facts.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}：</dt>
                          <dd className={label === "主演" ? "clamp" : undefined}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Link>
              );
            })}
          </div>
          {data.pageCount > 1 ? <Pager page={data.page} pageCount={data.pageCount} total={data.total} totalExact={data.totalExact} hrefFor={pageHref} /> : null}
        </>
      ) : null}
    </div>
  );
}
