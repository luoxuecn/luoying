import { getRss } from "@/lib/film";
import { fail, ok } from "@/lib/respond";

export async function GET() {
  try {
    return ok(await getRss());
  } catch (error) {
    return fail(error);
  }
}
