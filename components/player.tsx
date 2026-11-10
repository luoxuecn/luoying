"use client";

import { useEffect, useRef, useState } from "react";
import type Artplayer from "artplayer";
import { IconRefresh } from "./icons";

type Phase = "loading" | "ready" | "switch" | "error";

export function Player({ playId }: { playId: string }) {
  const slotRef = useRef<HTMLDivElement>(null);
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
    const slot = slotRef.current;
    if (!slot) return;
    let cancelled = false;
    let art: Artplayer | null = null;
    let hls: { destroy: () => void } | null = null;

    fetch(`/api/play?playId=${encodeURIComponent(playId)}`)
      .then(async (response) => response.json() as Promise<{ ok: boolean; data?: { parse?: number; url?: string }; error?: { message?: string } }>)
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
  }, [playId, attempt]);

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
