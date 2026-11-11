export interface FilterOption {
  name: string;
  value: string;
}

export interface FilterGroup {
  key: "tid" | "jq" | "area" | "year" | "yuyan" | "letter";
  name: string;
  value: FilterOption[];
}

export interface Category {
  type_id: "1" | "2" | "3" | "4" | "44";
  type_name: string;
  landing: string;
}

const ALL: FilterOption = { name: "全部", value: "" };

export const CATEGORIES: Category[] = [
  { type_id: "1", type_name: "电影", landing: "/frim/index1.html" },
  { type_id: "2", type_name: "电视剧", landing: "/frim/index2.html" },
  { type_id: "3", type_name: "综艺", landing: "/frim/index3.html" },
  { type_id: "4", type_name: "动漫", landing: "/frim/index4.html" },
  { type_id: "44", type_name: "短剧", landing: "/frim/index44.html" },
];

export const SORTS: FilterOption[] = [
  { name: "按时间", value: "time" },
  { name: "按人气", value: "hit" },
  { name: "按推荐", value: "commend" },
  { name: "按评分", value: "douban" },
];

export const SECTION_ORDERS = ["monthhit", "weekhit"] as const;

export const SHARED_FILTERS: FilterGroup[] = [
  {
    key: "jq",
    name: "剧情",
    value: [
      ALL,
      { name: "剧情", value: "剧情" },
      { name: "喜剧", value: "喜剧" },
      { name: "动作", value: "动作" },
      { name: "爱情", value: "爱情" },
      { name: "科幻", value: "科幻" },
      { name: "动画", value: "动画" },
      { name: "悬疑", value: "悬疑" },
      { name: "惊悚", value: "惊悚" },
      { name: "恐怖", value: "恐怖" },
      { name: "犯罪", value: "犯罪" },
      { name: "同性", value: "同性" },
      { name: "音乐", value: "音乐" },
      { name: "歌舞", value: "歌舞" },
      { name: "传记", value: "传记" },
      { name: "历史", value: "历史" },
      { name: "西部", value: "西部" },
      { name: "奇幻", value: "奇幻" },
      { name: "冒险", value: "冒险" },
      { name: "灾难", value: "灾难" },
      { name: "武侠", value: "武侠" },
      { name: "情色", value: "情色" },
      { name: "旅游", value: "旅游" },
    ],
  },
  {
    key: "area",
    name: "地区",
    value: [
      ALL,
      { name: "大陆", value: "大陆" },
      { name: "香港", value: "香港" },
      { name: "台湾", value: "台湾" },
      { name: "日本", value: "日本" },
      { name: "韩国", value: "韩国" },
      { name: "美国", value: "美国" },
      { name: "英国", value: "英国" },
      { name: "法国", value: "法国" },
      { name: "泰国", value: "泰国" },
      { name: "印度", value: "印度" },
      { name: "加拿大", value: "加拿大" },
      { name: "西班牙", value: "西班牙" },
    ],
  },
  {
    key: "year",
    name: "年份",
    value: [
      ALL,
      { name: "2026", value: "2026" },
      { name: "2025", value: "2025" },
      { name: "2024", value: "2024" },
      { name: "2023", value: "2023" },
      { name: "2022", value: "2022" },
      { name: "2021", value: "2021" },
      { name: "2020", value: "2020" },
      { name: "2019", value: "2019" },
      { name: "2018", value: "2018" },
      { name: "2017", value: "2017" },
      { name: "2016", value: "2016" },
      { name: "2015", value: "2015" },
      { name: "2014", value: "2014" },
      { name: "2013", value: "2013" },
      { name: "2012", value: "2012" },
      { name: "其他年份", value: "more" },
      { name: "年份未知", value: "unknown" },
    ],
  },
  {
    key: "yuyan",
    name: "语言",
    value: [
      ALL,
      { name: "国语", value: "国语" },
      { name: "粤语", value: "粤语" },
      { name: "英语", value: "英语" },
      { name: "日语", value: "日语" },
      { name: "韩语", value: "韩语" },
      { name: "泰语", value: "泰语" },
      { name: "法语", value: "法语" },
      { name: "西班牙语", value: "西班牙语" },
    ],
  },
  {
    key: "letter",
    name: "字母",
    value: [
      ALL,
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({ name: letter, value: letter })),
      { name: "0-9", value: "0-9" },
    ],
  },
];

function tid(typeId: string, items: FilterOption[]): FilterGroup {
  return { key: "tid", name: "类型", value: [{ name: "全部", value: typeId }, ...items] };
}

export const FILTERS: Record<Category["type_id"], FilterGroup[]> = {
  "1": [
    tid("1", [
      { name: "动作片", value: "5" },
      { name: "科幻片", value: "7" },
      { name: "恐怖片", value: "8" },
      { name: "战争片", value: "9" },
      { name: "喜剧片", value: "10" },
      { name: "动画片", value: "41" },
      { name: "剧情片", value: "12" },
      { name: "爱情片", value: "6" },
      { name: "纪录片", value: "11" },
    ]),
    ...SHARED_FILTERS,
  ],
  "2": [
    tid("2", [
      { name: "国产剧", value: "13" },
      { name: "港台剧", value: "14" },
      { name: "欧美剧", value: "15" },
      { name: "日韩剧", value: "16" },
      { name: "海外剧", value: "42" },
    ]),
    ...SHARED_FILTERS,
  ],
  "3": [
    tid("3", [
      { name: "内地综艺", value: "29" },
      { name: "港台综艺", value: "30" },
      { name: "欧美综艺", value: "32" },
      { name: "日韩综艺", value: "33" },
    ]),
    ...SHARED_FILTERS,
  ],
  "4": [
    tid("4", [
      { name: "国产动漫", value: "34" },
      { name: "日韩动漫", value: "35" },
      { name: "欧美动漫", value: "36" },
    ]),
    ...SHARED_FILTERS,
  ],
  "44": [
    tid("44", [
      { name: "短剧", value: "28" },
      { name: "微电影", value: "39" },
      { name: "AI漫剧", value: "45" },
    ]),
    ...SHARED_FILTERS,
  ],
};

export const CHANNEL_IDS = CATEGORIES.map((item) => item.type_id);

const ORDER_VALUES = new Set<string>([...SORTS.map((item) => item.value), ...SECTION_ORDERS]);

export function isChannelId(value: string): value is Category["type_id"] {
  return CHANNEL_IDS.some((id) => id === value);
}

export function categoryName(typeId: string) {
  return CATEGORIES.find((item) => item.type_id === typeId)?.type_name ?? "";
}

export function channelForTid(tid: string): Category["type_id"] | "" {
  if (isChannelId(tid)) return tid;
  for (const category of CATEGORIES) {
    const group = FILTERS[category.type_id].find((item) => item.key === "tid");
    if (group?.value.some((item) => item.value === tid)) return category.type_id;
  }
  return "";
}

export function isAllowedOrder(value: string) {
  return ORDER_VALUES.has(value);
}

export function isAllowedFilter(typeId: Category["type_id"], key: FilterGroup["key"], value: string) {
  const group = FILTERS[typeId].find((item) => item.key === key);
  return Boolean(group?.value.some((item) => item.value === value));
}

export function categoriesPayload() {
  return {
    categories: CATEGORIES,
    filters: FILTERS,
    sorts: SORTS,
    sectionOrders: SECTION_ORDERS,
  };
}
