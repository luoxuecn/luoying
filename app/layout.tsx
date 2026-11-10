import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "落雪影视", template: "%s · 落雪影视" },
  description: "电影、电视剧、综艺、动漫、短剧",
  appleWebApp: { title: "落雪影视" },
  icons: { icon: "/mark.svg", apple: "/mark.svg" },
};

export const viewport: Viewport = {
  themeColor: "#10141c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <div className="site">
          <Suspense fallback={<div className="header" />}>
            <SiteHeader />
          </Suspense>
          <main className="page">{children}</main>
          <footer className="footer">
            <div className="footer-inner">
              <img src="/mark.svg" alt="" width={18} height={18} />
              <span>落雪影视</span>
              <span className="footer-note">电影、电视剧、综艺、动漫、短剧</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
