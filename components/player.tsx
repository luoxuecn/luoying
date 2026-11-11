"use client";

import { useEffect, useRef, useState } from "react";
import type Artplayer from "artplayer";
import { findHistory } from "@/lib/history";
import { IconRefresh } from "./icons";

type Phase = "loading" | "ready" | "switch" | "error";

export interface PlayReady {
  parse: number;
  url: string;
}

export function Player({
  playId,
  videoId,
  initial = null,
  onProgress,
}: {
  playId: string;
  videoId: string;
  initial?: PlayReady | null;
  onProgress?: (progress: number, duration: number, reason: "time" | "pause" | "ended") => void;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const onProgressRef = useRef(onProgress);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("片源暂时不可用");
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${playId}#${attempt}`;
  const [tracked, setTracked] = useState(requestKey);
  if (requestKey !== tracked) {
    setTracked(requestKey);
    setPhase("loading");
  }

  useEffect(() => {
    onProgressRef.current = onProgress;
  });

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let cancelled = false;
    let art: Artplayer | null = null;
    let hls: { destroy: () => void } | null = null;
    const record = findHistory(videoId);
    const startAt = record && record.playId === playId ? record.progress : 0;
    let armed = startAt < 1;
    let lastWrite = 0;

    const ready =
      attempt === 0
        ? Promise.resolve(
            initial
              ? { ok: true as const, data: initial }
              : { ok: false as const, error: { message: "片源暂时不可用" } },
          )
        : fetch(`/api/play?playId=${encodeURIComponent(playId)}`).then(
            async (response) => response.json() as Promise<{ ok: boolean; data?: { parse?: number; url?: string }; error?: { message?: string } }>,
          );
    ready
      .then(async (body) => {
        if (cancelled) return;
        if (!body.ok || !body.data) {
          setMessage(body.error?.message || "片源暂时不可用");
          setPhase("error");
          return;
        }
        if (body.data.parse !== 0 || !body.data.url) {
          setPhase("switch");
          return;
        }
        const source = body.data.url;
        const [{ default: Artplayer }, { default: Hls }] = await Promise.all([import("artplayer"), import("hls.js")]);
        if (cancelled || !slotRef.current) return;
        const useHls = source.includes(".m3u8");
        art = new Artplayer({
          container: slotRef.current,
          url: source,
          type: useHls ? "m3u8" : "video",
          theme: "#e4b15a",
          lang: "zh-cn",
          volume: 0.8,
          autoplay: false,
          pip: true,
          mutex: true,
          setting: true,
          playbackRate: true,
          aspectRatio: false,
          fullscreen: true,
          fullscreenWeb: false,
          miniProgressBar: true,
          playsInline: true,
          moreVideoAttr: { playsInline: true },
          customType: {
            m3u8(video, url) {
              if (Hls.isSupported()) {
                const player = new Hls();
                hls = player;
                player.loadSource(url);
                player.attachMedia(video);
                player.on(Hls.Events.ERROR, (_event, info) => {
                  if (info.fatal && !cancelled) {
                    setMessage("这条线路暂时播不了，换一条试试");
                    setPhase("error");
                  }
                });
                return;
              }
              if (video.canPlayType("application/vnd.apple.mpegurl")) {
                video.src = url;
                return;
              }
              if (!cancelled) {
                setMessage("当前浏览器播不了这条线路");
                setPhase("error");
              }
            },
          },
        });
        const place = () => {
          if (cancelled || !art || armed) return;
          const duration = Number(art.duration);
          if (!Number.isFinite(duration) || duration <= 1) return;
          const target = Math.min(startAt, Math.max(0, duration - 1));
          if (target >= 1 && art.currentTime < target - 1) art.currentTime = target;
          if (art.currentTime >= target - 1.5) armed = true;
        };
        const report = (reason: "time" | "pause" | "ended") => {
          const notify = onProgressRef.current;
          if (cancelled || !art || !armed || !notify) return;
          const duration = Number(art.duration);
          const progress = Number(art.currentTime);
          if (!Number.isFinite(progress)) return;
          if (reason === "time") {
            const now = Date.now();
            if (now - lastWrite < 5000) return;
            lastWrite = now;
          } else {
            lastWrite = Date.now();
          }
          notify(progress, Number.isFinite(duration) ? duration : 0, reason);
        };
        art.on("ready", place);
        art.on("video:loadedmetadata", place);
        art.on("video:canplay", place);
        art.on("video:timeupdate", () => {
          place();
          report("time");
        });
        art.on("video:pause", () => report("pause"));
        art.on("video:ended", () => report("ended"));
        if (!cancelled) setPhase("ready");
        art.on("error", () => {
          if (!cancelled) {
            setMessage("这条线路暂时播不了，换一条试试");
            setPhase("error");
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("片源暂时不可用");
          setPhase("error");
        }
      });

    return () => {
      cancelled = true;
      hls?.destroy();
      art?.destroy(true);
    };
  }, [playId, videoId, attempt, initial]);

  return (
    <div className="player-frame">
      <div className="art-slot" ref={slotRef} />
      {phase === "loading" ? <div className="player-mask">正在取播放地址</div> : null}
      {phase === "switch" ? <div className="player-mask">这条线路没有可播放的地址，换一条线路试试</div> : null}
      {phase === "error" ? (
        <div className="player-mask">
          <span>{message}</span>
          <button className="retry" type="button" aria-label="重试" title="重试" onClick={() => setAttempt((value) => value + 1)}>
            <IconRefresh />
          </button>
        </div>
      ) : null}
    </div>
  );
}
