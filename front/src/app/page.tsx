import { Suspense } from "react";
import PlayLanding from "@/components/PlayLanding";

export default function HomePage() {
  return (
    <Suspense>
      <PlayLanding />
    </Suspense>
  );
}
