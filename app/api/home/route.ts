import { getHome } from "@/lib/film";
import { fail, ok } from "@/lib/respond";

export async function GET() {
  try {
    return ok(await getHome());
  } catch (error) {
    return fail(error);
  }
}
