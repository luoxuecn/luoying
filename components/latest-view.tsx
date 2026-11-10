"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, categoryName } from "@/lib/catalog";
import type { Card } from "@/lib/parse";
import { LoadingBlock, Poster, Status, cardMeta } from "./media";
import { useApi } from "./use-api";

interface LatestData {
  empty?: boolean;
  list: Card[];
}

export function LatestView() {
  const params = useSearchParams();
  const typeId = params.get("typeId") || "";
  const path = typeId ? `/api/videos?typeId=${encodeURIComponent(typeId)}&order=time` : "/api/latest";
  const { status, data, error, retry } = useApi<LatestData>(path);
  const title = typeId ? `${categoryName(typeId) || "频道"} · 最近更新` : "最近更新";
  return (
    <div>
      <div className="page-head">
        <h1>{title}</h1>
      </div>
      <div className="pills">
        {CATEGORIES.map((item) => (
          <Link className={item.type_id === typeId ? "chip active" : "chip"} href={`/latest?typeId=${item.type_id}`} key={item.type_id}>
            {item.type_name}
          </Link>
        ))}
      </div>
      {status === "loading" ? <LoadingBlock /> : null}
      {status === "error" ? <Status title="最近更新暂时打不开" detail={error.message} retry={error.retryable ? retry : undefined} /> : null}
      {status === "ready" && (data.empty || data.list.length === 0) ? <Status title="暂时没有更新" /> : null}
      {status === "ready" && data.list.length ? (
        <div className="grid">
          {data.list.map((card) => (
            <Poster card={card} key={card.id} meta={cardMeta(card)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
