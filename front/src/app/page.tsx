import AuthGuard from "@/components/auth/AuthGuard";
import PhaserGame from "../components/PhaserGame";

export default function HomePage() {
  return (
    <AuthGuard>
      <PhaserGame />
    </AuthGuard>
  );
}
