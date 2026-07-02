import { Suspense } from "react";
import PlayerGuard from "@/components/auth/PlayerGuard";
import PhaserGame from "@/components/PhaserGame";

export default function GamePage() {
  return (
    <Suspense>
      <PlayerGuard>
        <PhaserGame />
      </PlayerGuard>
    </Suspense>
  );
}
