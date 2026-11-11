"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FILTERS, SORTS, categoryName, type FilterGroup } from "@/lib/catalog";
import type { Card } from "@/lib/parse";
import { filterHref, type ListQuery } from "@/lib/paths";
import { chipLabel, chipRow, chipScroller, pageHead, pageTitle, posterFrame, posterGrid } from "@/lib/ui";
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

  const primary = filters.filter((group) => group.key !== "year" && group.key !== "letter");
  const extra = filters.filter((group) => group.key === "year" || group.key === "letter");
  const extraKey = `${query.year}|${query.letter}`;
  const [trackedExtra, setTrackedExtra] = useState(extraKey);
  const [openMore, setOpenMore] = useState(Boolean(query.year || query.letter));
  if (trackedExtra !== extraKey) {
    setTrackedExtra(extraKey);
    if (query.year || query.letter) setOpenMore(true);
  }

  return (
    <div>
      <div className={pageHead}>
        <h1 className={pageTitle}>{name}</h1>
      </div>
      <div className="mb-[18px] flex flex-col gap-2.5">
        {primary.map((group) => (
          <ChipRow label={group.name} key={group.key}>
            {group.value.map((option) => (
              <Link className={active(group.key, option.value) ? "chip active" : "chip"} href={hrefFor(group.key, option.value)} key={`${group.key}-${option.value}`}>
                {option.name}
              </Link>
            ))}
          </ChipRow>
        ))}
        {extra.length ? (
          <div className={chipRow}>
            <div className={chipLabel}>更多</div>
            <button className={openMore ? "chip active" : "chip"} type="button" aria-expanded={openMore} onClick={() => setOpenMore((value) => !value)}>
              {openMore ? "收起筛选" : "更多筛选"}
            </button>
          </div>
        ) : null}
        {openMore
          ? extra.map((group) => (
              <ChipRow label={group.name} key={group.key}>
                {group.value.map((option) => (
                  <Link className={active(group.key, option.value) ? "chip active" : "chip"} href={hrefFor(group.key, option.value)} key={`${group.key}-${option.value}`}>
                    {option.name}
                  </Link>
                ))}
              </ChipRow>
            ))
          : null}
        <ChipRow label="排序">
          {SORTS.map((option) => (
            <Link className={active("order", option.value) ? "chip active" : "chip"} href={hrefFor("order", option.value)} key={option.value}>
              {option.name}
            </Link>
          ))}
        </ChipRow>
      </div>
      {data.empty ? <Status title="没有找到相关影片" /> : null}
      {!data.empty ? (
        <>
          <div className={posterFrame}>
            <div className={posterGrid}>
              {data.list.map((card) => (
                <Poster card={card} key={card.id} />
              ))}
            </div>
          </div>
          <Pager page={data.page} pageCount={data.pageCount} total={data.total} totalExact={data.totalExact} hrefFor={pageHref} />
        </>
      ) : null}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const narrow = window.matchMedia("(max-width: 1279px)").matches;
      const max = node.scrollWidth - node.clientWidth;
      setFade(narrow && max > 4 && node.scrollLeft < max - 4);
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
  }, []);

  return (
    <div className={chipRow}>
      <div className={chipLabel}>{label}</div>
      <div className={fade ? `${chipScroller} max-xl:[mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)]` : chipScroller} ref={ref}>
        {children}
      </div>
    </div>
  );
}
