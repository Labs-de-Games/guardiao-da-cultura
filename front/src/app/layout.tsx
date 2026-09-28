import Script from "next/script";
import type { ReactNode } from "react";
import { OfflineGate } from "@/components/OfflineGate";
import PostHogPageView from "@/components/PostHogPageView";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import { ToastProvider } from "@/components/ToastProvider";
import { ConsentProvider } from "@/lib/consent/ConsentContext";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, height: "100%" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Jockey+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{ margin: 0, padding: 0, height: "100vh", overflow: "hidden" }}
      >
        <ConsentProvider>
          <PostHogProvider>
            <ThemeRegistry>
              <ToastProvider>
                <PostHogPageView />
                <OfflineGate>{children}</OfflineGate>
              </ToastProvider>
            </ThemeRegistry>
          </PostHogProvider>
        </ConsentProvider>
        <Script
          src="https://t.contentsquare.net/uxa/bb88b6a708c9e.js"
          strategy="afterInteractive"
        />
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18191558713"
          strategy="afterInteractive"
        />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18191558713');
          `}
        </Script>
      </body>
    </html>
  );
}
