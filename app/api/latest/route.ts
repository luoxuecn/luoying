import { getLatest } from "@/lib/film";
import { fail, ok } from "@/lib/respond";

export async function GET() {
  try {
    return ok(await getLatest());
  } catch (error) {
    return fail(error);
  }
}
