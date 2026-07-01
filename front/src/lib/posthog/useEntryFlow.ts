"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { EntryFlow } from "@/game/main";
import { useFeatureFlag } from "./FeatureFlagContext";

const FLAG_TIMEOUT_MS = 5000;

export function useEntryFlow(): { entryFlow: EntryFlow; isLoading: boolean } {
  const searchParams = useSearchParams();
  const flowParam = searchParams.get("flow");
  const flagValue = useFeatureFlag("entry_flow_experiment");

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (flagValue !== undefined) return;
    const timer = setTimeout(() => setTimedOut(true), FLAG_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [flagValue]);

  if (flowParam === "direct" || flowParam === "map") {
    return { entryFlow: flowParam as EntryFlow, isLoading: false };
  }

  const isLoading = flagValue === undefined && !timedOut;
  const entryFlow: EntryFlow = flagValue === "direct" ? "direct" : "map";

  return { entryFlow, isLoading };
}
