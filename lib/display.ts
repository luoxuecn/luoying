const BLANK = /^(内详|不详|暂无|未知)$/;
const CLARITY = /^(?:更新至)?HD(?:中字|国语)?$/;

export function shownFact(value?: string) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text || BLANK.test(text) || text.includes("暂无")) return "";
  return text;
}

export function formatRemark(value?: string) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.replace(/更新至第?(\d{4})(\d{2})(\d{2})期/g, (_all, _year, month, day) => `${Number(month)}-${Number(day)}期`);
}

export function posterRemark(value?: string) {
  const text = formatRemark(value);
  if (!text || CLARITY.test(text)) return "";
  return text;
}

export function rankAside(card: { vod_remarks?: string; vod_douban_score?: string }) {
  const remark = formatRemark(card.vod_remarks);
  if (remark && !CLARITY.test(remark)) return remark;
  const score = (card.vod_douban_score || "").trim();
  if (score && !score.includes("暂无") && !CLARITY.test(score)) return score;
  return "";
}
