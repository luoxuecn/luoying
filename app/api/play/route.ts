import { NextRequest } from "next/server";
import { getPlay } from "@/lib/film";
import { fail, ok } from "@/lib/respond";

export async function GET(request: NextRequest) {
  try {
    return ok(await getPlay(request.nextUrl.searchParams));
  } catch (error) {
    return fail(error);
  }
}
