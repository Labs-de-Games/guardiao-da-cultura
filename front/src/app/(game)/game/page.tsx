import { Suspense } from "react";
import PlayerGuard from "@/components/auth/PlayerGuard";
import { ConsentGuard } from "@/components/consent/ConsentGuard";
import PhaserGame from "@/components/PhaserGame";

export default function GamePage() {
  return (
    <Suspense>
      {/* Outermost: Phaser must not boot behind an unanswered consent
          dialog, even when the player lands on /game directly (#864). */}
      <ConsentGuard>
        <PlayerGuard>
          <PhaserGame />
        </PlayerGuard>
      </ConsentGuard>
    </Suspense>
  );
}
