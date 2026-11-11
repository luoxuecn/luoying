import Link from "next/link";
import { CATEGORIES, categoryName } from "@/lib/catalog";
import type { Card } from "@/lib/parse";
import { latestHref } from "@/lib/paths";
import { cardMeta } from "@/lib/cards";
import { Poster, Status } from "./media";

interface LatestData {
  empty?: boolean;
  list: Card[];
}

export function LatestView({ typeId, data }: { typeId: string; data: LatestData }) {
  const title = typeId ? `${categoryName(typeId) || "频道"} · 最近更新` : "最近更新";
  return (
    <div>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <div className="pills">
        <Link className={typeId ? "chip" : "chip active"} href={latestHref()}>
          全部
        </Link>
        {CATEGORIES.map((item) => (
          <Link className={item.type_id === typeId ? "chip active" : "chip"} href={latestHref(item.type_id)} key={item.type_id}>
            {item.type_name}
          </Link>
        ))}
      </div>
      {data.empty || data.list.length === 0 ? <Status title="暂时没有更新" /> : null}
      {data.list.length ? (
        <div className="grid">
          {data.list.map((card) => (
            <Poster card={card} key={card.id} meta={cardMeta(card)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
