"use client";

import Link from "next/link";
import { FILTERS, SORTS, categoryName, type FilterGroup } from "@/lib/catalog";
import type { Card } from "@/lib/parse";
import { filterHref, type ListQuery } from "@/lib/paths";
import { cardMeta } from "@/lib/cards";
import { Pager, Poster, Status } from "./media";

interface ListData {
  page: number;
  pageCount: number;
  total: number;
  totalExact: boolean;
  empty: boolean;
  list: Card[];
}

export function ListView({ query, data }: { query: ListQuery; data: ListData }) {
  const name = categoryName(query.typeId) || "影片";
  const filters = FILTERS[query.typeId];

  function hrefFor(key: FilterGroup["key"] | "order", value: string) {
    const next: ListQuery = { ...query, page: 1 };
    if (key === "order") next.order = !value || value === "time" ? "time" : value;
    else if (key === "tid") next.tid = !value || value === query.typeId ? query.typeId : value;
    else next[key] = value;
    return filterHref(next);
  }

  function pageHref(page: number) {
    return filterHref({ ...query, page });
  }

  const active = (key: FilterGroup["key"] | "order", value: string) => {
    if (key === "tid") return query.tid === value;
    if (key === "order") return query.order === value;
    return query[key] === value;
  };

  return (
    <div>
      <div className="page-head">
        <h1>{name}</h1>
      </div>
      <div className="filters">
        {filters.map((group) => (
          <div className="filter-row" key={group.key}>
            <div className="filter-label">{group.name}</div>
            <div className="chips">
              {group.value.map((option) => (
                <Link className={active(group.key, option.value) ? "chip active" : "chip"} href={hrefFor(group.key, option.value)} key={`${group.key}-${option.value}`}>
                  {option.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
        <div className="filter-row">
          <div className="filter-label">排序</div>
          <div className="chips">
            {SORTS.map((option) => (
              <Link className={active("order", option.value) ? "chip active" : "chip"} href={hrefFor("order", option.value)} key={option.value}>
                {option.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {data.empty ? <Status title="没有找到相关影片" /> : null}
      {!data.empty ? (
        <>
          <div className="grid">
            {data.list.map((card) => (
              <Poster card={card} key={card.id} meta={cardMeta(card)} />
            ))}
          </div>
          <Pager page={data.page} pageCount={data.pageCount} total={data.total} totalExact={data.totalExact} hrefFor={pageHref} />
        </>
      ) : null}
    </div>
  );
}
