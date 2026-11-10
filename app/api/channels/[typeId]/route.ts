import { getChannel } from "@/lib/film";
import { fail, ok } from "@/lib/respond";

export async function GET(_request: Request, context: { params: Promise<{ typeId: string }> }) {
  try {
    const { typeId } = await context.params;
    return ok(await getChannel(typeId));
  } catch (error) {
    return fail(error);
  }
}
