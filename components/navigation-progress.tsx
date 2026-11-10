"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function beginNavigation() {
  window.dispatchEvent(new Event("luoxue:navigate"));
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [seen, setSeen] = useState(pathname);
  const [active, setActive] = useState(false);
  if (pathname !== seen) {
    setSeen(pathname);
    setActive(false);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setActive(true);
    }
    function onStart() {
      setActive(true);
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onStart);
    window.addEventListener("luoxue:navigate", onStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onStart);
      window.removeEventListener("luoxue:navigate", onStart);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive(false), 20000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;
  return <div className="nav-progress" role="progressbar" aria-label="页面加载中" />;
}
