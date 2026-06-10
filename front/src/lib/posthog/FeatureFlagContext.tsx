"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface FeatureFlagContextValue {
  distinctId: string | null;
  featureFlags: Record<string, string | boolean | number>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  distinctId: null,
  featureFlags: {},
});

export function FeatureFlagProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: FeatureFlagContextValue;
}) {
  const [value, setValue] = useState<FeatureFlagContextValue>(
    initialData ?? { distinctId: null, featureFlags: {} },
  );

  useEffect(() => {
    if (initialData) {
      setValue(initialData);
    }
  }, [initialData]);

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(
  flagName: string,
): string | boolean | number | undefined {
  const { featureFlags } = useContext(FeatureFlagContext);
  return featureFlags[flagName];
}

export function usePostHogDistinctId(): string | null {
  const { distinctId } = useContext(FeatureFlagContext);
  return distinctId;
}
