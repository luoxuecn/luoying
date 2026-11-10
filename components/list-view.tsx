"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { categoryName, type FilterGroup } from "@/lib/catalog";
import type { Card } from "@/lib/parse";
import { LoadingBlock, Pager, Poster, Status, cardMeta } from "./media";
import { useApi } from "./use-api";

interface Categories {
  filters: Record<string, FilterGroup[]>;
  sorts: { name: string; value: string }[];
}

interface ListData {
  page: number;
  pageCount: number;
  total: number;
  totalExact: boolean;
  empty: boolean;
  list: Card[];
}

export function ListView() {
  const params = useSearchParams();
  const typeId = params.get("typeId") || "1";
  const name = categoryName(typeId) || "影片";
  const query = params.toString();
  const categories = useApi<Categories>("/api/categories");
  const videos = useApi<ListData>(`/api/videos${query ? `?${query}` : ""}`);
  const filters = categories.data?.filters[typeId] || [];

  function hrefFor(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    const clear = value === "" || (key === "tid" && value === typeId) || (key === "order" && value === "time");
    if (clear) next.delete(key);
    else next.set(key, value);
    if (!next.get("typeId")) next.set("typeId", typeId);
    next.delete("page");
    return `/list?${next.toString()}`;
  }

  function pageHref(page: number) {
    const next = new URLSearchParams(params.toString());
    if (!next.get("typeId")) next.set("typeId", typeId);
    if (page <= 1) next.delete("page");
    else next.set("page", String(page));
    return `/list?${next.toString()}`;
  }

  const active = (key: string, value: string) => {
    const current = params.get(key) || "";
    if (key === "tid") return (current || typeId) === value;
    if (key === "order") return (current || "time") === value;
    return current === value;
  };

  return (
    <div>
      <div className="page-head">
        <h1>{name}</h1>
      </div>
      {categories.status === "error" ? (
        <Status title="筛选暂时不可用" detail={categories.error.message} retry={categories.retry} />
      ) : (
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
              {(categories.data?.sorts || []).map((option) => (
                <Link className={active("order", option.value) ? "chip active" : "chip"} href={hrefFor("order", option.value)} key={option.value}>
                  {option.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      {videos.status === "loading" ? <LoadingBlock /> : null}
      {videos.status === "error" ? (
        <Status title="列表暂时打不开" detail={videos.error.message} retry={videos.error.retryable ? videos.retry : undefined} />
      ) : null}
      {videos.status === "ready" && videos.data.empty ? <Status title="没有找到相关影片" /> : null}
      {videos.status === "ready" && !videos.data.empty ? (
        <>
          <div className="grid">
            {videos.data.list.map((card) => (
              <Poster card={card} key={card.id} meta={cardMeta(card)} />
            ))}
          </div>
          <Pager page={videos.data.page} pageCount={videos.data.pageCount} total={videos.data.total} totalExact={videos.data.totalExact} hrefFor={pageHref} />
        </>
      ) : null}
    </div>
  );
}
