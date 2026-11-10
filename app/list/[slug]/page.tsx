import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { ListView } from "@/components/list-view";
import { PageFailure } from "@/components/media";
import { categoryName } from "@/lib/catalog";
import { asApiError } from "@/lib/errors";
import { getVideos } from "@/lib/film";
import { listSearchParams, parseListSlug, type ListQuery } from "@/lib/paths";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    return { title: categoryName(parseListSlug(slug).typeId) || "筛选" };
  } catch {
    return { title: "筛选" };
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let query: ListQuery | null = null;
  let data: Awaited<ReturnType<typeof getVideos>> | null = null;
  let failure: { message: string; retryable: boolean } | null = null;
  try {
    query = parseListSlug(slug);
    data = await getVideos(listSearchParams(query));
  } catch (error) {
    unstable_rethrow(error);
    const api = asApiError(error);
    failure = { message: api.message, retryable: api.retryable };
  }
  if (!query || !data) return <PageFailure title="列表暂时打不开" detail={failure?.message} retryable={failure?.retryable} />;
  return <ListView query={query} data={data} />;
}
