import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { filterHref, filterHrefFromSearch } from "@/lib/paths";

export const metadata: Metadata = { title: "筛选" };
export const instant = false;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  redirect(Object.keys(raw).length ? filterHrefFromSearch(raw) : filterHref({}));
}
