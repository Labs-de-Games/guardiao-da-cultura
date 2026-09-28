import type { ReactNode } from "react";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { OfflineNotice } from "@/components/errors/OfflineNotice";

export default function GameGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
      <ConsentBanner />
    </>
  );
}
