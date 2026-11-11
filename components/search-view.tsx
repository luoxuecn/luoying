"use client";

import Link from "next/link";
import { shownFact } from "@/lib/display";
import type { Card } from "@/lib/parse";
import { searchHref } from "@/lib/paths";
import { Pager, PosterFace, Status } from "./media";

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
  return shownFact(value?.replace(/[,，]\s*/g, " "));
}

function summaryLine(card: Card) {
  return [shownFact(card.vod_year), shownFact(card.vod_area), shownFact(card.type_name), names(card.vod_actor)].filter(Boolean).join(" · ");
}

export function SearchView({ query, data }: { query: string; data: SearchData | null }) {
  function pageHref(nextPage: number) {
    return searchHref(query, nextPage);
  }

  return (
    <div>
      <div className="page-head">
        <h1>{query ? `搜索「${query}」` : "搜索"}</h1>
        {data?.totalExact ? <span className="faint">{data.total} 条结果</span> : null}
      </div>
      {!query ? <Status title="输入片名后再搜索" /> : null}
      {query && data?.empty ? <Status title="没有找到相关影片" detail="换一个关键词试试" /> : null}
      {query && data && !data.empty ? (
        <>
          <div className="search-list">
            {data.list.map((card) => {
              const facts = [
                ["主演", names(card.vod_actor)],
                ["导演", names(card.vod_director)],
                ["地区", shownFact(card.vod_area)],
                ["类型", shownFact(card.type_name)],
                ["语言", shownFact(card.vod_lang)],
                ["年份", shownFact(card.vod_year)],
                ["豆瓣", shownFact(card.vod_douban_score)],
              ].filter((item): item is [string, string] => Boolean(item[1]));
              const summary = summaryLine(card);
              return (
                <Link className="search-row" href={`/play/${card.id}`} key={card.id}>
                  <PosterFace card={card} />
                  <div className="search-copy">
                    <h2>{card.vod_name}</h2>
                    {summary ? <p className="search-summary">{summary}</p> : null}
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
