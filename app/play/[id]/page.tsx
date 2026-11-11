import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { PlayView, type Detail } from "@/components/play-view";
import { PlayRoute } from "@/components/play-route";
import { PageFailure } from "@/components/media";
import { asApiError } from "@/lib/errors";
import { loadVideo } from "@/lib/load";
import { playHref, queryValue } from "@/lib/paths";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const data = (await loadVideo(id)) as unknown as Detail;
    return { title: data.vod_name || "播放" };
  } catch {
    return { title: "播放" };
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const requested = queryValue((await searchParams).playId);
  if (requested) redirect(playHref(id, requested));
  let data: Detail | null = null;
  let failure: { message: string; retryable: boolean } | null = null;
  try {
    data = (await loadVideo(id)) as unknown as Detail;
  } catch (error) {
    unstable_rethrow(error);
    const api = asApiError(error);
    failure = { message: api.message, retryable: api.retryable };
  }
  if (!data) return <PageFailure title="影片暂时打不开" detail={failure?.message} retryable={failure?.retryable} />;
  return (
    <PlayRoute>
      <PlayView key={id} id={id} playId="" data={data} source={null} />
    </PlayRoute>
  );
}
