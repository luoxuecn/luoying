"use client";

import { useEffect } from "react";

function pixels(delta: number, mode: number, page: number) {
  if (mode === 1) return delta * 16;
  if (mode === 2) return delta * page;
  return delta;
}

function horizontalScroller(target: EventTarget | null) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      const overflowX = getComputedStyle(node).overflowX;
      const canPan = (overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth + 1;
      if (canPan) return node;
    }
    node = node.parentElement;
  }
  return null;
}

// Trackpads deliver a horizontal swipe as a wheel event. Chrome often keeps that
// gesture for history navigation until the scroller is clicked, so pan here.
export function TrackpadPan() {
  useEffect(() => {
    const snapTimers = new WeakMap<HTMLElement, number>();

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const scroller = horizontalScroller(event.target);
      if (!scroller) return;
      scroller.style.overscrollBehaviorX = "contain";
      const dx = pixels(event.deltaX, event.deltaMode, scroller.clientWidth);
      const dy = pixels(event.deltaY, event.deltaMode, scroller.clientHeight);
      if (Math.abs(dx) <= Math.abs(dy)) return;
      const max = scroller.scrollWidth - scroller.clientWidth;
      const next = Math.max(0, Math.min(max, scroller.scrollLeft + dx));
      if (next === scroller.scrollLeft) return;
      event.preventDefault();
      scroller.style.scrollSnapType = "none";
      scroller.scrollLeft = next;
      const pending = snapTimers.get(scroller);
      if (pending) window.clearTimeout(pending);
      snapTimers.set(
        scroller,
        window.setTimeout(() => {
          scroller.style.scrollSnapType = "";
          snapTimers.delete(scroller);
        }, 200),
      );
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  return null;
}
