import PlayerGuard from "@/components/auth/PlayerGuard";
import PhaserGame from "../components/PhaserGame";

export default function HomePage() {
  return (
    <PlayerGuard>
      <PhaserGame />
    </PlayerGuard>
  );
}
