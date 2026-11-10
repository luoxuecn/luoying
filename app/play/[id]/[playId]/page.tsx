import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { PlayView, type Detail } from "@/components/play-view";
import { PlayRoute } from "@/components/play-route";
import { PageFailure } from "@/components/media";
import type { PlayReady } from "@/components/player";
import { asApiError } from "@/lib/errors";
import { loadPlay, loadVideo } from "@/lib/load";

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

export default async function Page({ params }: { params: Promise<{ id: string; playId: string }> }) {
  const { id, playId } = await params;
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
  let source: PlayReady | null = null;
  let invalidPlay = false;
  try {
    const played = await loadPlay(playId);
    source = { parse: played.parse, url: played.url };
  } catch (error) {
    unstable_rethrow(error);
    const api = asApiError(error);
    if (api.code === "INVALID_PARAMS") invalidPlay = true;
  }
  if (invalidPlay) return <PageFailure title="编号无效" detail="编号无效" />;
  return (
    <PlayRoute>
      <PlayView id={id} playId={playId} data={data} source={source} />
    </PlayRoute>
  );
}
