export class PostHogStub {
  private sessionId = `stub-session-${Math.random().toString(36).slice(2)}`;
  private distinctId = `stub-distinct-${Math.random().toString(36).slice(2)}`;
  private properties: Record<string, unknown> = {};

  capture(event: string, properties?: Record<string, unknown>) {
    console.log("[PostHogStub] capture:", { event, properties });
  }

  identify(id: string) {
    console.log("[PostHogStub] identify:", id);
    this.distinctId = id;
  }

  reset() {
    console.log("[PostHogStub] reset");
  }

  captureException(error: Error) {
    console.log("[PostHogStub] captureException:", error);
  }

  get_session_id() {
    return this.sessionId;
  }

  get_distinct_id() {
    return this.distinctId;
  }

  register(properties: Record<string, unknown>) {
    console.log("[PostHogStub] register:", properties);
    Object.assign(this.properties, properties);
  }

  get_property(key: string) {
    return this.properties[key];
  }
}
