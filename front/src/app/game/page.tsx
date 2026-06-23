import PlayerGuard from "@/components/auth/PlayerGuard";
import PhaserGame from "@/components/PhaserGame";

export default function GamePage() {
  return (
    <PlayerGuard>
      <PhaserGame />
    </PlayerGuard>
  );
}
