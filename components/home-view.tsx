"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { listHref } from "@/lib/links";
import type { Card } from "@/lib/parse";
import { IconChevronLeft, IconChevronRight } from "./icons";
import { LoadingBlock, Poster, Status, cardMeta } from "./media";
import { useApi } from "./use-api";

interface HomeData {
  banner: Card[];
  shortcuts: { name: string; order?: string; typeId?: string; target?: string }[];
  sections: { title: string; todayCount?: number; more?: { typeId?: string; tid?: string; order?: string; target?: string }; list: Card[] }[];
}

const showHomeBanner = false;

export function HomeView() {
  const { status, data, error, retry } = useApi<HomeData>("/api/home");
  if (status === "loading") return <LoadingBlock kind={showHomeBanner ? "home" : "grid"} />;
  if (status === "error") return <Status title="首页暂时打不开" detail={error.message} retry={error.retryable ? retry : undefined} />;
  const sections = data.sections.filter((section) => !section.title.includes("最近更新") && section.more?.target !== "latest");
  const hasCards = (showHomeBanner && data.banner.length > 0) || sections.some((section) => section.list.length > 0);
  if (!hasCards) return <Status title="暂时没有影片" />;
  return (
    <div>
      {showHomeBanner && data.banner.length ? <Banner items={data.banner} /> : null}
      {sections.map((section) => (
        <section className="section" key={section.title}>
          <div className="section-head">
            <h2>
              {section.title}
              {section.todayCount ? <span className="faint"> · 今日 {section.todayCount} 部</span> : null}
            </h2>
            {section.more ? (
              <Link href={listHref(section.more)} aria-label="更多" title="更多">
                <IconChevronRight size={16} />
              </Link>
            ) : null}
          </div>
          {section.list.length ? (
            <CardRow>
              {section.list.map((card) => (
                <Poster card={card} key={card.id} meta={cardMeta(card)} />
              ))}
            </CardRow>
          ) : (
            <p className="faint">这个分区暂时没有影片</p>
          )}
        </section>
      ))}
    </div>
  );
}

function CardRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const max = node.scrollWidth - node.clientWidth;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      setEdges({
        left: wide && node.scrollLeft > 4,
        right: wide && max > 4 && node.scrollLeft < max - 4,
      });
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

  function move(direction: number) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth - 48, 160), behavior: "smooth" });
  }

  return (
    <div className="home-row">
      <div className="scroller" ref={ref}>
        {children}
      </div>
      {edges.left ? (
        <button className="home-row-nav prev" type="button" aria-label="向左查看" onClick={() => move(-1)}>
          <IconChevronLeft />
        </button>
      ) : null}
      {edges.right ? (
        <button className="home-row-nav next" type="button" aria-label="向右查看" onClick={() => move(1)}>
          <IconChevronRight />
        </button>
      ) : null}
    </div>
  );
}

function Banner({ items }: { items: Card[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % items.length), 6000);
    return () => window.clearInterval(timer);
  }, [items.length]);
  const current = items[index] || items[0];
  const turn = (step: number) => {
    setFailed(false);
    setIndex((value) => (value + step + items.length) % items.length);
  };
  return (
    <section className="banner" aria-roledescription="carousel">
      <Link href={`/play/${current.id}`}>
        {current.vod_pic && !failed ? (
          // Poster hosts vary per title, so the browser loads the address from the API directly.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.vod_pic} alt={current.vod_name} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        ) : null}
        <div className="banner-shade">
          <h2>{current.vod_name}</h2>
          {current.vod_remarks ? <p>{current.vod_remarks}</p> : null}
        </div>
      </Link>
      {items.length > 1 ? (
        <>
          <button className="banner-nav prev" type="button" aria-label="上一张" onClick={() => turn(-1)}>
            <IconChevronLeft />
          </button>
          <button className="banner-nav next" type="button" aria-label="下一张" onClick={() => turn(1)}>
            <IconChevronRight />
          </button>
          <div className="dots">
            {items.map((item, itemIndex) => (
              <button
                className={itemIndex === index ? "on" : undefined}
                type="button"
                aria-label={item.vod_name}
                key={item.id}
                onClick={() => {
                  setFailed(false);
                  setIndex(itemIndex);
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
