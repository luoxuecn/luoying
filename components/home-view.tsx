"use client";

import Link from "next/link";
import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { listHref } from "@/lib/links";
import type { Card } from "@/lib/parse";
import { IconChevronLeft, IconChevronRight } from "./icons";
import { cardMeta } from "@/lib/cards";
import { homeStrip, posterFrame } from "@/lib/ui";
import { Poster, Status } from "./media";

interface HomeData {
  banner: Card[];
  shortcuts: { name: string; order?: string; typeId?: string; target?: string }[];
  sections: { title: string; todayCount?: number; more?: { typeId?: string; tid?: string; order?: string; target?: string }; list: Card[] }[];
}

const showHomeBanner = false;

export function HomeView({ data }: { data: HomeData }) {
  const sections = data.sections.filter((section) => !section.title.includes("最近更新") && section.more?.target !== "latest");
  const hasCards = (showHomeBanner && data.banner.length > 0) || sections.some((section) => section.list.length > 0);
  if (!hasCards) return <Status title="暂时没有影片" />;
  return (
    <div className="home">
      {showHomeBanner && data.banner.length ? <Banner items={data.banner} /> : null}
      {sections.map((section) => (
        <section className="mt-[26px] first:-mt-3" key={section.title}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-xl font-[650] tracking-tight">
              {section.title}
              {section.todayCount ? <span className="faint"> · 今日 {section.todayCount} 部</span> : null}
            </h2>
            {section.more ? (
              <Link className="inline-flex size-7 items-center justify-center rounded-lg text-faint hover:bg-soft hover:text-fg" href={listHref(section.more)} aria-label="更多" title="更多">
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
  const [edges, setEdges] = useState({ left: false, right: false, fadeLeft: false, fadeRight: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const max = node.scrollWidth - node.clientWidth;
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      setEdges({
        left: wide && node.scrollLeft > 4,
        right: wide && max > 4 && node.scrollLeft < max - 4,
        fadeLeft: !wide && node.scrollLeft > 4,
        fadeRight: !wide && max > 4 && node.scrollLeft < max - 4,
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

  const mask = edges.fadeLeft && edges.fadeRight
    ? "[mask-image:linear-gradient(to_right,transparent,#000_24px,#000_calc(100%-40px),transparent)]"
    : edges.fadeLeft
      ? "[mask-image:linear-gradient(to_right,transparent,#000_24px)]"
      : edges.fadeRight
        ? "[mask-image:linear-gradient(to_left,transparent,#000_40px)]"
        : "";

  const count = Math.max(Children.count(children), 1);

  return (
    <div className="relative">
      <div className={posterFrame}>
        <div className={`${homeStrip} ${mask}`} style={{ "--home-cards": count } as CSSProperties} ref={ref}>
          {children}
        </div>
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
      {edges.fadeLeft || edges.fadeRight ? <p className="mt-2 text-xs text-faint lg:hidden">左右滑动查看</p> : null}
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
