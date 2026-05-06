type SyncEventType = "LOGIN" | "LOGOUT" | "LOGOUT_ALL";

interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
}

function getChannel(): BroadcastChannel | null {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    return new BroadcastChannel("gameplate_auth_sync");
  }
  return null;
}

export function subscribeToAuthSync(
  onEvent: (type: SyncEventType) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const channel = getChannel();

  const handleMessage = (event: MessageEvent<SyncEvent>) => {
    if (event.data?.type) {
      onEvent(event.data.type);
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "gameplate_auth_sync") {
      try {
        const data: SyncEvent = JSON.parse(event.newValue ?? "{}");
        if (data.type) {
          onEvent(data.type);
        }
      } catch {
        // ignore invalid storage events
      }
    }
  };

  if (channel) {
    channel.addEventListener("message", handleMessage);
  } else {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    if (channel) {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    } else {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function broadcastAuthEvent(type: SyncEventType): void {
  if (typeof window === "undefined") return;

  const event: SyncEvent = { type, timestamp: Date.now() };

  const channel = getChannel();
  if (channel) {
    channel.postMessage(event);
  }

  // Fallback for older browsers
  try {
    localStorage.setItem("gameplate_auth_sync", JSON.stringify(event));
    // Clean up to keep storage clean
    setTimeout(() => {
      localStorage.removeItem("gameplate_auth_sync");
    }, 1000);
  } catch {
    // ignore localStorage errors
  }
}
