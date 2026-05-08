import type { ReactNode } from "react";
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
        <ThemeRegistry>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
