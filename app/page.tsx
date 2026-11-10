import { unstable_rethrow } from "next/navigation";
import { HomeView } from "@/components/home-view";
import { PageFailure } from "@/components/media";
import { asApiError } from "@/lib/errors";
import { getHome } from "@/lib/film";

export const instant = false;

export default async function Page() {
  let data: Awaited<ReturnType<typeof getHome>> | null = null;
  let failure: { message: string; retryable: boolean } | null = null;
  try {
    data = await getHome();
  } catch (error) {
    unstable_rethrow(error);
    const api = asApiError(error);
    failure = { message: api.message, retryable: api.retryable };
  }
  if (!data) return <PageFailure title="首页暂时打不开" detail={failure?.message} retryable={failure?.retryable} />;
  return <HomeView data={data} />;
}
