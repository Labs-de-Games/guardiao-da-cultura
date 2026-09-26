import { notFound } from "next/navigation";

// Unknown /game/* paths only reach game/not-found.tsx through notFound();
// otherwise Next.js falls back to the root 404.
export default function GameCatchAll() {
  notFound();
}
