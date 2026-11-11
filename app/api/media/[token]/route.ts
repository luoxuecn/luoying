import { NextResponse } from "next/server";
import { fail } from "@/lib/respond";
import { invalid } from "@/lib/errors";
import { fetchMedia, openMedia, readMediaToken, rewritePlaylist } from "@/lib/media-proxy";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const target = readMediaToken(token);
    if (!target) throw invalid("地址不正确");
    const range = request.headers.get("range");
    const { response, url } = await fetchMedia(target, range);
    const opened = await openMedia(response, url);
    if (opened.kind === "playlist") {
      return new NextResponse(rewritePlaylist(opened.text, opened.url.toString()), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    const headers = new Headers({
      "Content-Type": opened.type,
      "Cache-Control": "private, max-age=300",
    });
    const contentRange = opened.headers.get("content-range");
    const acceptRanges = opened.headers.get("accept-ranges");
    if (contentRange) headers.set("Content-Range", contentRange);
    if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
    return new NextResponse(opened.stream, { status: opened.status, headers });
  } catch (error) {
    return fail(error);
  }
}
