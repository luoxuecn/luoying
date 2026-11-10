import { getVideo } from "@/lib/film";
import { fail, ok } from "@/lib/respond";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(await getVideo(id));
  } catch (error) {
    return fail(error);
  }
}
