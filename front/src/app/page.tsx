import { Suspense } from "react";
import PlayLanding from "@/components/PlayLanding";
import { MobileBlocker } from "@/ui/mobile/MobileBlocker";

export default function HomePage() {
  return (
    <Suspense>
      <PlayLanding />
      <MobileBlocker />
    </Suspense>
  );
}
