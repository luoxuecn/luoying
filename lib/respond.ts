import { NextResponse } from "next/server";
import { asApiError, errorBody } from "./errors";

export function ok(data: unknown) {
  return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
}

export function fail(error: unknown) {
  const apiError = asApiError(error);
  return NextResponse.json(errorBody(apiError), {
    status: apiError.status,
    headers: { "Cache-Control": "no-store" },
  });
}
