"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/catalog";
import { channelHref, listTypeFromPath, searchHref, searchQueryFromPath } from "@/lib/paths";
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
    <header className="header">
      <div className="header-inner">
        <Link className="brand" href="/">
          <img className="brand-mark" src="/mark.svg" alt="" width={22} height={22} />
          落雪影视
        </Link>
        <button className="search-icon" type="button" aria-label="搜索" aria-expanded={open} onClick={() => setOpen(true)}>
          <IconSearch />
        </button>
        <HistoryMenu />
        <nav className="nav" aria-label="频道">
          {LINKS.map((item) => {
            const active =
              item.key === "rank"
                ? pathname.startsWith("/rank")
                : item.key === "latest"
                  ? pathname.startsWith("/latest")
                  : pathname.startsWith("/list/") && listType === item.key;
            return (
              <Link className={active ? "active" : undefined} href={item.href} key={item.href}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="search">
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
