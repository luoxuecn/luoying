"use client";

import { useEffect, useState } from "react";

export interface ApiErrorBody {
  code: string;
  message: string;
  retryable: boolean;
}

type State<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: ApiErrorBody };

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${path ?? ""}#${attempt}`;
  const [tracked, setTracked] = useState(requestKey);
  if (requestKey !== tracked) {
    setTracked(requestKey);
    setState({ status: "loading" });
  }

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    fetch(path, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { ok: boolean; data?: T; error?: ApiErrorBody };
        if (!body.ok || body.data == null) {
          setState({
            status: "error",
            error: body.error || { code: "UPSTREAM_ERROR", message: "片源暂时不可用", retryable: true },
          });
          return;
        }
        setState({ status: "ready", data: body.data });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", error: { code: "UPSTREAM_ERROR", message: "片源暂时不可用", retryable: true } });
      });
    return () => controller.abort();
  }, [path, attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
