"use client";

import Link from "next/link";
import { shownFact } from "@/lib/display";
import type { Card } from "@/lib/parse";
import { searchHref } from "@/lib/paths";
import { pageHead, pageTitle } from "@/lib/ui";
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

export function SearchView({ query, data }: { query: string; data: SearchData | null }) {
  function pageHref(nextPage: number) {
    return searchHref(query, nextPage);
  }

  return (
    <div>
      <div className={pageHead}>
        <h1 className={pageTitle}>{query ? `搜索「${query}」` : "搜索"}</h1>
        {data?.totalExact ? <span className="faint">{data.total} 条结果</span> : null}
      </div>
      {!query ? <Status title="输入片名后再搜索" /> : null}
      {query && data?.empty ? <Status title="没有找到相关影片" detail="换一个关键词试试" /> : null}
      {query && data && !data.empty ? (
        <>
          <div className="search-list flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:gap-x-7 xl:gap-y-2">
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
              return (
                <Link className="search-row grid grid-cols-[112px_1fr] items-start gap-3 rounded-xl p-3 hover:bg-elev sm:grid-cols-[168px_1fr] sm:gap-[18px] xl:grid-cols-[96px_1fr] xl:gap-3" href={`/play/${card.id}`} key={card.id}>
                  <PosterFace card={card} />
                  <div className="search-copy">
                    <h2>{card.vod_name}</h2>
                    {facts.length ? (
                      <dl className="search-facts">
                        {facts.map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}：</dt>
                            <dd className={label === "主演" ? "clamp" : undefined}>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
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
