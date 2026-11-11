"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/catalog";
import { channelHref, listTypeFromPath, searchHref, searchQueryFromPath } from "@/lib/paths";
import { shell } from "@/lib/ui";
import { HistoryMenu } from "./history-menu";
import { beginNavigation } from "./navigation-progress";
import { IconSearch } from "./icons";

const LINKS = [
  ...CATEGORIES.map((item) => ({ href: channelHref(item.type_id), label: item.type_name, key: item.type_id })),
  { href: "/latest", label: "最近更新", key: "latest" },
  { href: "/rank", label: "排行榜", key: "rank" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const query = searchQueryFromPath(pathname);
  const listType = listTypeFromPath(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/92 backdrop-blur-[16px]">
      <div className={`${shell} flex min-h-16 flex-wrap content-center items-center gap-x-0.5 gap-y-0.5 py-2 lg:flex-nowrap lg:gap-[18px] lg:py-0`}>
        <Link className="order-1 flex shrink-0 items-center gap-2 text-lg font-bold tracking-wide" href="/">
          <img className="block size-[22px] rounded-md" src="/mark.svg" alt="" width={22} height={22} />
          落雪影视
        </Link>
        <button className="search-icon order-2 ml-auto inline-flex lg:hidden" type="button" aria-label="搜索" aria-expanded={open} onClick={() => setOpen(true)}>
          <IconSearch />
        </button>
        <HistoryMenu />
        <nav className="order-4 flex min-w-0 basis-full items-center gap-0.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:order-2 lg:basis-auto" aria-label="频道">
          {LINKS.map((item) => {
            const active =
              item.key === "rank"
                ? pathname.startsWith("/rank")
                : item.key === "latest"
                  ? pathname.startsWith("/latest")
                  : pathname.startsWith("/list/") && listType === item.key;
            return (
              <Link className={active ? "shrink-0 rounded-lg bg-soft px-1.5 py-1.5 text-sm text-fg sm:px-2.5" : "shrink-0 rounded-lg px-1.5 py-1.5 text-sm text-muted hover:bg-soft hover:text-fg sm:px-2.5"} href={item.href} key={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="search order-3 ml-auto hidden min-w-0 flex-[0_1_240px] lg:block">
          <form
            action="/search"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const keyword = String(data.get("q") || "").trim();
              if (!keyword) return;
              beginNavigation();
              router.push(searchHref(keyword));
            }}
          >
            <input key={query} name="q" defaultValue={query} placeholder="搜索片名" aria-label="搜索片名" />
            <button type="submit" aria-label="搜索">
              <IconSearch />
            </button>
          </form>
        </div>
      </div>
      {open ? (
        <div className="search-mask" onClick={() => setOpen(false)}>
          <form
            className="search-pop"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const keyword = String(new FormData(event.currentTarget).get("q") || "").trim();
              if (!keyword) return;
              setOpen(false);
              beginNavigation();
              router.push(searchHref(keyword));
            }}
          >
            <input name="q" defaultValue={query} placeholder="搜索片名" aria-label="搜索片名" autoFocus />
            <button type="submit" aria-label="搜索">
              <IconSearch />
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
