"use client";

import { useEffect, useState } from "react";
import type { EntryFlow } from "@/game/main";
import { useFeatureFlag } from "./FeatureFlagContext";

const FLAG_TIMEOUT_MS = 5000;

export function useEntryFlow(): { entryFlow: EntryFlow; isLoading: boolean } {
  const flagValue = useFeatureFlag("entry_flow_experiment");

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (flagValue !== undefined) return;
    const timer = setTimeout(() => setTimedOut(true), FLAG_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [flagValue]);

  const isLoading = flagValue === undefined && !timedOut;
  const entryFlow: EntryFlow = flagValue === "map" ? "map" : "direct";

  return { entryFlow, isLoading };
}
