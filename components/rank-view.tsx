import Link from "next/link";
import { rankAside } from "@/lib/display";
import { filterHref } from "@/lib/paths";
import type { Card } from "@/lib/parse";
import { IconChevronRight } from "./icons";
import { PageFailure } from "./media";

export function RankView({
  panels,
}: {
  panels: { typeId: string; name: string; title: string; list: Card[]; error: { message: string; retryable: boolean } | null }[];
}) {
  return (
    <div>
      <div className="page-head">
        <h1>排行榜</h1>
      </div>
      <div className="rank-board">
        {panels.map((panel) => (
          <section className="rank-panel" key={panel.typeId}>
            <div className="rank-head">
              <span className="rank-top">TOP</span>
              <h2>{panel.title}</h2>
              <Link href={filterHref({ typeId: panel.typeId, area: "大陆" })} aria-label="更多" title="更多">
                <IconChevronRight size={16} />
              </Link>
            </div>
            {panel.error ? <PageFailure title={panel.error.message} retryable={panel.error.retryable} /> : null}
            {!panel.error && panel.list.length === 0 ? <p className="rank-empty">这个榜单暂时没有影片</p> : null}
            {!panel.error && panel.list.length > 0 ? (
              <ol className="rank-list">
                {panel.list.map((card, index) => {
                  const note = rankAside(card);
                  return (
                    <li key={card.id}>
                      <Link href={`/play/${card.id}`}>
                        <span className={index < 3 ? "rank-no hot" : "rank-no"}>{index + 1}</span>
                        <span className="rank-name">{card.vod_name}</span>
                        {note ? <span className="rank-note">{note}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
