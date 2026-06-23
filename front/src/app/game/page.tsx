import PlayerGuard from "@/components/auth/PlayerGuard";
import PhaserGame from "@/components/PhaserGame";
import type { EntryFlow } from "@/game/main";

export default async function GamePage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const params = await searchParams;
  const entryFlow: EntryFlow = params.flow === "map" ? "map" : "direct";

  return (
    <PlayerGuard>
      <PhaserGame entryFlow={entryFlow} />
    </PlayerGuard>
  );
}
