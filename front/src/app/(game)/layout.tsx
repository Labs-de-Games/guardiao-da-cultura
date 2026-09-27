import type { ReactNode } from "react";
import { OfflineNotice } from "@/components/errors/OfflineNotice";

export default function GameGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
    </>
  );
}
