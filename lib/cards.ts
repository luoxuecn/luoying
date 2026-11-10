import type { Card } from "./parse";

export function cardMeta(card: Card) {
  return [card.vod_year, card.vod_area].filter(Boolean).join(" · ");
}
