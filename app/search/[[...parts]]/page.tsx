import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { SearchView } from "@/components/search-view";
import { PageFailure } from "@/components/media";
import { asApiError } from "@/lib/errors";
import { searchVideos } from "@/lib/film";
import { decodePathSegment, queryValue, searchHref } from "@/lib/paths";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ parts?: string[] }> }): Promise<Metadata> {
  const { parts } = await params;
  const query = parts?.[0] ? decodePathSegment(parts[0]) : "";
  return { title: query ? `搜索「${query}」` : "搜索" };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ parts?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { parts } = await params;
  if (!parts?.length) {
    const raw = await searchParams;
    const query = queryValue(raw.q).trim();
    const page = Number(queryValue(raw.page) || "1");
    if (query) redirect(searchHref(query, Number.isFinite(page) && page > 1 ? page : 1));
    return <SearchView query="" data={null} />;
  }
  if (parts.length > 2) return <PageFailure title="搜索地址不正确" />;
  const query = decodePathSegment(parts[0]).trim();
  const page = parts[1] ? Number(parts[1]) : 1;
  if (!query || !Number.isInteger(page) || page < 1) return <PageFailure title="搜索地址不正确" />;
  let data: Awaited<ReturnType<typeof searchVideos>> | null = null;
  let failure: { message: string; retryable: boolean } | null = null;
  try {
    data = await searchVideos(new URLSearchParams({ q: query, page: String(page) }));
  } catch (error) {
    unstable_rethrow(error);
    const api = asApiError(error);
    failure = { message: api.message, retryable: api.retryable };
  }
  if (!data) return <PageFailure title="搜索暂时不可用" detail={failure?.message} retryable={failure?.retryable} />;
  return <SearchView query={query} data={data} />;
}
