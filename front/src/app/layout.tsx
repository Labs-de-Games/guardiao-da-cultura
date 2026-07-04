import Script from "next/script";
import type { ReactNode } from "react";
import PostHogPageView from "@/components/PostHogPageView";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/lib/auth/AuthContext";

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
        <PostHogProvider>
          <ThemeRegistry>
            <AuthProvider>
              <ToastProvider>
                <PostHogPageView />
                {children}
              </ToastProvider>
            </AuthProvider>
          </ThemeRegistry>
        </PostHogProvider>
        <Script
          src="https://t.contentsquare.net/uxa/bb88b6a708c9e.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.responsivevoice.org/sdk/latest/responsivevoice.js"
          strategy="afterInteractive"
        />
        <Script id="rv-verify" strategy="afterInteractive">
          {`responsiveVoice.init({ apiKey: "${process.env.NEXT_PUBLIC_RESPONSIVE_VOICE_KEY}" });`}
        </Script>
      </body>
    </html>
  );
}
