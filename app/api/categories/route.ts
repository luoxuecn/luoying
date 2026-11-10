import { getCategories } from "@/lib/film";
import { ok } from "@/lib/respond";

export function GET() {
  return ok(getCategories());
}
