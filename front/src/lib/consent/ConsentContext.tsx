"use client";

import posthog from "posthog-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { env } from "../env";
import {
  type ConsentRecord,
  readConsent,
  writeConsent,
} from "./consentStorage";
import { clearPostHogStorage, reloadPage } from "./posthogTeardown";

/**
 * `"loading"` only exists for the first client render: the record lives in
 * localStorage, which cannot be read during SSR or the hydration pass without
 * producing a server/client HTML mismatch. Nothing renders the banner while
 * loading, so a returning player never sees it flash.
 */
export type ConsentState = "loading" | "undecided" | "accepted" | "declined";

interface ConsentContextValue {
  state: ConsentState;
  record: ConsentRecord | null;
  accept: () => void;
  decline: () => void;
  /** Revoke a previously granted consent: stops capture and wipes PostHog's storage. */
  revoke: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  state: "loading",
  record: null,
  accept: () => {},
  decline: () => {},
  revoke: () => {},
});

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRecord(readConsent());
    setLoaded(true);
  }, []);

  const accept = useCallback(() => {
    setRecord(writeConsent("accepted"));
  }, []);

  const decline = useCallback(() => {
    setRecord(writeConsent("declined"));
  }, []);

  const revoke = useCallback(() => {
    // Order matters: stop the sending first, then drop the identity, then
    // remove what was persisted — see posthogTeardown.ts.
    try {
      posthog.opt_out_capturing();
      posthog.reset(true);
    } catch {
      // Never initialized (declined from the start, or no key): nothing to
      // stop, and the storage sweep below is still worth running.
    }
    clearPostHogStorage(env.client.posthogKey);
    writeConsent("declined");

    // The only reliable way to silence the ~60 modules that hold the
    // posthog-js singleton directly. Reached from the world map, never
    // mid-level, so nothing in flight is lost.
    reloadPage();
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      state: !loaded ? "loading" : (record?.status ?? "undecided"),
      record,
      accept,
      decline,
      revoke,
    }),
    [loaded, record, accept, decline, revoke],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  return useContext(ConsentContext);
}
