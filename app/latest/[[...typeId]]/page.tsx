import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { LatestView } from "@/components/latest-view";
import { PageFailure } from "@/components/media";
import { categoryName, isChannelId } from "@/lib/catalog";
import { asApiError } from "@/lib/errors";
import { getLatest, getVideos } from "@/lib/film";
import { latestHref, queryValue } from "@/lib/paths";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ typeId?: string[] }> }): Promise<Metadata> {
  const { typeId } = await params;
  const channel = typeId?.[0] || "";
  return { title: channel ? `${categoryName(channel) || "频道"} · 最近更新` : "最近更新" };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ typeId?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { typeId: segments } = await params;
  if (segments && (segments.length > 1 || !isChannelId(segments[0]))) return <PageFailure title="频道不正确" />;
  const typeId = segments?.[0] || "";
  if (!typeId) {
    const requested = queryValue((await searchParams).typeId);
    if (requested) redirect(latestHref(requested));
  }
  let data: Awaited<ReturnType<typeof getLatest>> | null = null;
  let failure: { message: string; retryable: boolean } | null = null;
  try {
    data = typeId ? await getVideos(new URLSearchParams({ typeId })) : await getLatest();
  } catch (error) {
    unstable_rethrow(error);
    const api = asApiError(error);
    failure = { message: api.message, retryable: api.retryable };
  }
  if (!data) return <PageFailure title="最近更新暂时打不开" detail={failure?.message} retryable={failure?.retryable} />;
  return <LatestView typeId={typeId} data={data} />;
}
