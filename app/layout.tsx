import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteHeader } from "@/components/site-header";
import { TrackpadPan } from "@/components/trackpad-pan";
import { shell } from "@/lib/ui";
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: 'try{if(location.pathname.startsWith("/play/"))document.documentElement.dataset.play="true"}catch(e){}',
          }}
        />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <TrackpadPan />
        <div className="flex min-h-svh flex-col">
          <Suspense fallback={<div className="sticky top-0 z-20 h-16 border-b border-line bg-bg/92" />}>
            <SiteHeader />
          </Suspense>
          <main className={`${shell} flex-1 py-6 pb-8 in-data-[play=true]:pt-0 sm:pb-12 min-[1101px]:in-data-[play=true]:!w-full min-[1101px]:in-data-[play=true]:max-w-none`}>
            {children}
          </main>
          <footer className="border-t border-line">
            <div className={`${shell} flex min-h-14 flex-wrap items-center gap-x-2.5 gap-y-2 text-[13px] text-faint`}>
              <img className="size-[18px] rounded" src="/mark.svg" alt="" width={18} height={18} />
              <span>落雪影视</span>
              <span className="basis-full sm:ml-auto sm:basis-auto">电影、电视剧、综艺、动漫、短剧</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
