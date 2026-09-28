# PostHog Integration Plan

## Overview

This document outlines the implementation plan for integrating PostHog into the Gameplate monorepo. We will enable **Product Analytics**, **Web Analytics**, **Session Replay** (with canvas recording), and **Surveys** across both the Next.js frontend and NestJS backend.

**PostHog Instance:** PostHog Cloud (US Region)  
**Project Structure:** Single shared project for frontend and backend  
**Autocapture:** Explicitly disabled to avoid canvas noise  
**Session Linking:** Full client-server session propagation via Axios headers  

---

## Table of Contents

1. [Decisions & Rationale](#decisions--rationale)
2. [Environment Strategy](#environment-strategy)
3. [Environment Variables](#environment-variables)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Implementation](#backend-implementation)
6. [Feature Flags](#feature-flags)
7. [Event Taxonomy](#event-taxonomy)
8. [Survey Implementation](#survey-implementation)
9. [Error Tracking](#error-tracking)
10. [Testing & Validation](#testing--validation)
11. [Rollout Plan](#rollout-plan)

---

## Decisions & Rationale

### 1. PostHog Cloud US Region
We will use PostHog Cloud in the US region. The PostHog wizard (`npx @posthog/wizard@latest`) will be used for the Next.js frontend auto-setup. The NestJS backend requires manual integration using `posthog-node`.

### 2. Same Project for Frontend and Backend
Both frontend and backend will share the same PostHog project API key. This enables unified user profiles, cross-system funnels, and session-linked backend events.

### 3. Parallel Analytics Strategy (Hybrid)
We will **not** replace the existing custom `sendGameEvent()` analytics pipeline. PostHog runs in parallel:
- **Custom analytics** (`POST /api/v1/events`) continues to persist `GameEvent` entities to PostgreSQL for game-specific queries (leaderboards, match history, player stats).
- **PostHog** receives high-value product analytics events from both frontend (UI interactions, game milestones) and backend (auth lifecycle, server-side completions).

This preserves existing game data infrastructure while adding product insights.

### 4. Autocapture Disabled
`autocapture` is set to `false` in `posthog-js` initialization. A Phaser HTML5 Canvas game generates thousands of semantically meaningless click events. Instead, we rely on **explicit, rich `posthog.capture()` calls** for every meaningful interaction.

### 5. Early User Identification (Option A)
- `posthog.identify(user.id)` is called immediately after login/registration.
- `posthog.reset()` is called on logout.
- The `distinct_id` is the backend user UUID (not PII like email).
- This enables proper retention cohorts, conversion funnels (anonymous -> signed up -> active player), and linked Session Replay.

### 6. Canvas Recording Enabled
`record_canvas: true` is enabled in `posthog-js` initialization. This allows Session Replay to capture actual Phaser canvas gameplay. **Warning:** This significantly increases replay data volume. Monitor PostHog billing and use `record_sessions_percent` for sampling if costs spike.

### 7. Session Linking via Axios Interceptors
To link backend events to frontend sessions:
- The frontend Axios instance will inject `X-PostHog-Session-ID` and `X-PostHog-Distinct-ID` headers on every API request.
- The NestJS `PostHogInterceptor` reads these headers and propagates them via `AsyncLocalStorage` to all `posthog.capture()` calls within that request.
- This enables unified session timelines across frontend interactions and backend API calls.

### 8. Web Analytics with PostHogPageView (Next.js App Router)
Since Next.js App Router does not emit `router.events`, we will use the standard PostHog pattern: a `PostHogPageView` component wrapped in `<Suspense>` that calls `posthog.capture('$pageview')` on every `usePathname()` change.

### 9. Authoritative Server-Side Events (Option B)
The backend is the source of truth for critical lifecycle events:
- `user_registered`, `user_verified`, `user_logged_in`
- Game completion events (`match_ended`)

Frontend captures UI interactions (`button_clicked`, `settings_opened`, `game_started`). Avoid double-counting by ensuring the same event is not captured on both sides.

### 10. Error Tracking on Both Frontend and Backend
- **Backend:** `PostHogInterceptor` with `captureExceptions: true`. Captures 5xx errors automatically with stack traces and session context.
- **Frontend:** `posthog.captureException(error)` in a global Next.js error boundary (`error.tsx` or `global-error.tsx`).
- This provides full error correlation: watch the Session Replay leading up to a backend 500.

---

## Environment Strategy

PostHog behavior differs across **Development**, **Staging**, and **Production** to prevent data pollution, control costs, and provide a safe testing surface.

### Development (`development`)

**Goal:** Zero noise in PostHog. Developers should not send localhost events to PostHog by default.

- **Initialization:** PostHog is **disabled** unless `NEXT_PUBLIC_POSTHOG_KEY` (frontend) or `POSTHOG_API_KEY` (backend) is explicitly set in `.env.local`.
- **Stub Mode:** When no key is set, a `PostHogStub` replaces the real client. It logs all `capture()`, `identify()`, `reset()`, and `captureException()` calls to the console with full event payloads. No network requests are sent. The stub also exposes `get_session_id()` and `get_distinct_id()` so that Axios interceptors and session-linking logic continue to work without errors.
- **Session Replay:** Disabled.
- **Surveys:** Disabled.
- **Error Tracking:** Disabled.
- **Debug Mode:** When a developer explicitly sets a personal PostHog project key, `posthog.debug()` is enabled to log all events to the browser console.
- **Data Destination:** If a developer wants to test against real PostHog, they create a personal PostHog project and use its key locally. Never use Production or Staging keys for day-to-day development.

### Staging (`staging`) — Deferred

Staging PostHog integration is documented here but **not yet implemented**. When staging is deployed:

- **Initialization:** Active. Uses the **Staging PostHog project** (separate from Production).
- **Session Replay:** Enabled with **10% sampling** (`record_sessions_percent: 0.1`). Canvas recording enabled for validation, but limited to keep costs low.
- **Surveys:** Enabled (`opt_in_site_apps: true`). Surveys are configured in the Staging PostHog project and target staging URLs only. QA can validate survey flow without affecting Production data.
- **Error Tracking:** Enabled. Captures exceptions on both frontend and backend.
- **Feature Flags:** Safe to test rollout percentages and targeting.
- **Data Destination:** Staging PostHog project. Events are tagged with `environment: "staging"`.

### Production (`production`)

**Goal:** Full feature set.

- **Initialization:** Active. Uses the **Production PostHog project**.
- **Session Replay:** Enabled with **100% sampling** (`record_sessions_percent: 1.0`). Canvas recording enabled to capture Phaser gameplay. All users (anonymous and authenticated) are recorded. Monitor data usage weekly; reduce sampling via the `session_replay_sampling_rate` feature flag if costs spike.
- **Surveys:** Enabled (`opt_in_site_apps: true`). Surveys are live for real players.
- **Error Tracking:** Enabled. `minStatusToCapture` remains at `500` by default (can be lowered to `400` if needed).
- **Data Destination:** Production PostHog project. Events are tagged with `environment: "production"`.

### Environment Property

Every event captured on both frontend and backend must include an `environment` super property:

- **Frontend:** Set once during `posthog.init` via `loaded` callback or `superProperties`.
- **Backend:** Set on every `capture()` call or via a wrapper service: `properties: { environment: config.nodeEnv }`.

This allows filtering in PostHog insights by `environment = 'production'` or `environment = 'staging'`.

### Recommended PostHog Project Setup

| Environment | PostHog Project | Purpose | Status |
|---|---|---|---|
| Development | None (disabled) or personal dev project | Prevent data pollution | Active |
| Staging | Dedicated "Gameplate Staging" project | QA, survey testing, feature flag validation | Deferred |
| Production | Dedicated "Gameplate Production" project | Live player analytics, surveys, replays | Active |

**Rationale for separate projects:** PostHog pricing is event-volume-based. Staging QA automation and manual testing would inflate Production event counts. Separate projects also prevent staging surveys from appearing to real users and keep staging errors out of Production alerts.

---

## Environment Variables

### Root `.env.example` (add these)

```bash
# PostHog (same project for frontend and backend)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

### Frontend (`front/src/lib/env.ts`)

Add to the Zod schema:

```typescript
NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
```

> **Note:** `NEXT_PUBLIC_POSTHOG_KEY` is `.optional()` so that the `PostHogStub` is used automatically in local development when no key is set.

### Backend (`back/src/core/config/config.service.ts`)

Add to the Zod schema:

```typescript
POSTHOG_API_KEY: z.string().optional(),
POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
```

> **Note:** `POSTHOG_API_KEY` is `.optional()` so that PostHog is silently disabled in local development when no key is set.

**Note:** The project API key (`phc_...`) is a public write-only key. It is safe to use in both frontend and backend. Never use a personal API key in application code.

**Exception (added by #738/#748):** the edital dashboard's HogQL Query API
(`front/src/lib/edital/server/hogql.ts`) genuinely requires a **personal**
API key with `query:read` scope — the project key above cannot run
arbitrary HogQL. That key (`POSTHOG_PERSONAL_API_KEY`) is confined to
files that `import "server-only"` (enforced at build time — `server-only`
throws if such a module is ever bundled into client code), is read
through `env-server.ts` only, and must never appear in a `NEXT_PUBLIC_*`
variable or a Docker build arg (those are visible in the built image and
in the browser bundle respectively). The write-key/read-key paths never
share code or a config getter — see `back/src/modules/posthog/*`, which
this exception does not touch.

---

## Frontend Implementation

### 1. Install PostHog

```bash
cd front
npm install posthog-js
```

### 2. Create PostHog Provider

Create `front/src/components/PostHogProvider.tsx`:

```tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { PostHogStub } from "../lib/posthogStub";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const env = process.env.NEXT_PUBLIC_ENV || "production";

    if (!key) {
      console.warn(
        "[PostHog] No key set. Using PostHogStub. Events will be logged to console only."
      );
      setClient(new PostHogStub());
      return;
    }

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      record_canvas: env === "production",
      opt_in_site_apps: env === "production",
      __add_tracing_headers: [],
      bootstrap: {
        distinctId: (window as any).__POSTHOG_DISTINCT_ID__,
        featureFlags: (window as any).__POSTHOG_FLAGS__ || {},
      },
      loaded: (ph) => {
        if (env === "development") {
          ph.debug();
        }
        const userId = (window as any).__INITIAL_USER_ID__;
        if (userId) {
          ph.identify(userId);
        }
        ph.register({ environment: env });
      },
    });

    setClient(posthog);
  }, []);

  if (!client) return <>{children}</>;

  return <PHProvider client={client}>{children}</PHProvider>;
}
```

Create `front/src/lib/posthogStub.ts`:

```typescript
export class PostHogStub {
  private sessionId = `stub-session-${Math.random().toString(36).slice(2)}`;
  private distinctId = `stub-distinct-${Math.random().toString(36).slice(2)}`;

  capture(event: string, properties?: Record<string, any>) {
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

  register(properties: Record<string, any>) {
    console.log("[PostHogStub] register:", properties);
  }
}
```

### 3. Create PostHogPageView Component

Create `front/src/components/PostHogPageView.tsx`:

```tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { usePostHog } from "posthog-js/react";

function PostHogPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      const url =
        window.origin +
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}
```

### 4. Update Root Layout

In `front/src/app/layout.tsx`, wrap the app with `PostHogProvider` and add `PostHogPageView`:

```tsx
import { PostHogProvider } from "../components/PostHogProvider";
import PostHogPageView from "../components/PostHogPageView";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <PostHogProvider>
          <PostHogPageView />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
```

### 5. Update Axios Instance with Session Headers

In your Axios setup file (e.g., `front/src/lib/api/client.ts` or wherever Axios is configured):

```typescript
import axios from "axios";
import posthog from "posthog-js";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // ... existing config
});

apiClient.interceptors.request.use((config) => {
  if (posthog.__loaded) {
    const sessionId = posthog.get_session_id();
    const distinctId = posthog.get_distinct_id();

    if (sessionId) {
      config.headers["X-PostHog-Session-ID"] = sessionId;
    }
    if (distinctId) {
      config.headers["X-PostHog-Distinct-ID"] = distinctId;
    }
  }
  return config;
});

export default apiClient;
```

### 6. Identify User on Login / Reset on Logout

In your auth flow (`front/src/lib/auth/AuthContext.tsx` or similar):

```typescript
import posthog from "posthog-js";

// After successful login
posthog.identify(user.id);

// On logout
posthog.reset();
```

### 7. Global Error Boundary (Frontend Error Tracking)

Create `front/src/app/global-error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Algo deu errado!</h2>
        <button onClick={() => reset()}>Tentar novamente</button>
      </body>
    </html>
  );
}
```

Also add `posthog.captureException(error)` to any existing `error.tsx` boundaries.

---

## Backend Implementation

### 1. Install PostHog

```bash
cd back
npm install posthog-node
```

### 2. Create PostHog Module

Create `back/src/modules/posthog/posthog.module.ts`:

```typescript
import { Module, Global } from "@nestjs/common";
import { PostHogService } from "./posthog.service";

@Global()
@Module({
  providers: [PostHogService],
  exports: [PostHogService],
})
export class PostHogModule {}
```

Create `back/src/modules/posthog/posthog.service.ts`:

```typescript
import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { PostHog } from "posthog-node";
import { ConfigService } from "../config/config.service";

@Injectable()
export class PostHogService implements OnModuleDestroy {
  private client: PostHog | null = null;
  private readonly logger = new Logger(PostHogService.name);

  constructor(private config: ConfigService) {
    if (config.posthogApiKey) {
      this.client = new PostHog(config.posthogApiKey, {
        host: config.posthogHost,
      });
    } else {
      this.logger.warn(
        "POSTHOG_API_KEY not set. PostHog is disabled. Events will not be sent."
      );
    }
  }

  getClient(): PostHog | null {
    return this.client;
  }

  capture(options: {
    event: string;
    distinctId?: string;
    properties?: Record<string, any>;
  }) {
    if (!this.client) {
      this.logger.debug("[PostHogStub] capture:", options);
      return;
    }
    this.client.capture({
      ...options,
      properties: {
        ...options.properties,
        environment: this.config.nodeEnv,
      },
    });
  }

  onModuleDestroy() {
    this.client?.shutdown();
  }
}
```

> **Note:** Add `posthogApiKey` and `posthogHost` getters to your `ConfigService` based on the Zod-validated env vars.

### 3. Register PostHogInterceptor Globally

In `back/src/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { PostHogInterceptor } from "posthog-node/nestjs";
import { AppModule } from "./app.module";
import { PostHogService } from "./modules/posthog/posthog.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const posthogService = app.get(PostHogService);
  const client = posthogService.getClient();

  if (client) {
    app.useGlobalInterceptors(
      new PostHogInterceptor(client, {
        captureExceptions: true,
        // minStatusToCapture: 400, // Uncomment to also capture 4xx errors
      })
    );
  }

  await app.listen(3000);
}
bootstrap();
```

### 4. Inject PostHog in Controllers/Services

Example in a controller:

```typescript
import { Controller, Post, Body } from "@nestjs/common";
import { PostHogService } from "../posthog/posthog.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly posthog: PostHogService) {}

  @Post("register")
  async register(@Body() body: RegisterDto) {
    const user = await this.authService.register(body);

    this.posthog.capture({
      event: "user_registered",
      distinctId: user.id,
      properties: {
        method: "email",
      },
    });

    return user;
  }
}
```

The `PostHogInterceptor` automatically reads `X-PostHog-Session-ID` and `X-PostHog-Distinct-ID` from incoming requests and propagates them. If you pass a `distinctId` explicitly in `capture()`, it will be used; otherwise, the interceptor falls back to the header value.

---

## Feature Flags

### First Flag: `session_replay_sampling_rate`

This flag controls the percentage of sessions recorded. It serves as an **emergency tuning mechanism** and validates the feature flag pipeline without touching game logic.

**Values:**
- `1.0` (100%) — Default at launch. All sessions are recorded.
- `0.5` (50%) — Reduce if replay data volume is higher than expected.
- `0.1` (10%) — Aggressive reduction for cost control.
- `0.0` (0%) — Emergency kill switch. No new sessions are recorded.

**Evaluation:** Page-load only. Once a session starts recording, it continues until the tab closes. Changing the flag in PostHog only affects new sessions.

### Frontend: Bootstrapped Flags

To avoid flicker (where the default sampling rate applies before flags are fetched), flags are **bootstrapped from the server** for authenticated users.

**Why bootstrap:** Session start is the most critical moment to capture (menu navigation, first-time user experience). Missing the first 5 seconds because of a flag fetch defeats the purpose.

**Bootstrapping flow:**
1. User logs in. Server knows `user.id`.
2. `PostHogProvider` fetches `/api/v1/posthog/bootstrap` after mount.
3. The response contains the user's `distinctId` and evaluated `featureFlags`.
4. `posthog.init()` uses these bootstrapped values immediately, then refreshes in the background.

**Anonymous users:** The game requires login to play, but auth pages (`/auth/login`, `/auth/register`) are tracked. Anonymous users do not bootstrap flags. They use the safe default (`record_sessions_percent: 1.0` at launch).

**Implementation in `PostHogProvider`:**

```tsx
async function fetchBootstrap(): Promise<PostHogBootstrapData | null> {
  try {
    const response = await fetch("/api/v1/posthog/bootstrap", {
      credentials: "include",
    });
    if (!response.ok) return null;
    return (await response.json()) as PostHogBootstrapData;
  } catch {
    return null;
  }
}

// Inside useEffect:
const bootstrap = await fetchBootstrap();

const recordSessionsPercent =
  typeof bootstrap?.featureFlags?.session_replay_sampling_rate === "number"
    ? (bootstrap.featureFlags.session_replay_sampling_rate as number)
    : 1.0;

posthog.init(key, {
  api_host: host || "https://us.i.posthog.com",
  autocapture: false,
  capture_pageview: false,
  record_sessions_percent: recordSessionsPercent,
  opt_in_site_apps: env === "production",
  __add_tracing_headers: [],
  bootstrap: {
    distinctID: bootstrap?.distinctId,
    featureFlags: bootstrap?.featureFlags ?? {},
  },
  loaded: (ph) => {
    if (env === "development") ph.debug();
    const userId = bootstrap?.distinctId;
    if (userId) ph.identify(userId);
    ph.register({ environment: env });
  },
});
```

### Backend: Flag Evaluation

Server-side flag evaluation uses `posthog-node`'s `getAllFlags` for performance. This leverages local evaluation when cached flag definitions are available, falling back to remote evaluation transparently:

```typescript
import { PostHogService } from "../posthog/posthog.service";

@Controller("posthog")
export class PostHogController {
  constructor(private readonly posthog: PostHogService) {}

  @Get("bootstrap")
  async bootstrap(@CurrentUser() user: User) {
    const client = this.posthog.getClient();
    const flags = client
      ? await client.getAllFlags(user.id)
      : {};

    return {
      distinctId: user.id,
      featureFlags: flags,
    };
  }
}
```

The `PostHogInterceptor` propagates the user's `distinct_id` from request headers, so flags can be evaluated for the correct user without extra context.

---

## Event Taxonomy

### Frontend Events (Explicit Capture)

> `EVENTS.md` at the repository root is the up-to-date event catalog; this
> table is the original plan, updated only for the events the edital
> dashboards read (#834).

| Event Name | Trigger | Properties |
|---|---|---|
| `$pageview` | Route change | `$current_url`, `$referrer` |
| `game_started` | Player clicks "Play" / level loads | `level_id`, `level_number` |
| `level_completed` | Level ends successfully | `level_id`, `level_number`, `score`, `stars`, `time_spent_ms`, `attempts` |
| `level_failed` | Level ends unsuccessfully | `level_id`, `score`, `time_spent_ms`, `reason` |
| `star_collected` | Player collects a collectible (star, clue, etc.) | `level_id`, `collectible_id`, `collectible_type`, `total_collected`, `total_available` |
| `first_star_earned` | **First star ever** earned, captured at ResultPanel | `level_id`, `total_score` |
| `badge_earned` | Player earns a badge | `badge_id`, `badge_name`, `level_id` |
| `quiz_completed` | Quiz minigame ends | `quiz_id`, `score`, `correct_answers`, `total_questions` |
| `clue_used` | Game shows a hint automatically (not a player action; not used by the edital dashboards) | `level_id`, `clue_index` |
| `investigation_opened` | Level 4 (investigation) screen opens | `level_id`, `level_number`, `collected_clues`, `shown_clues`, `previous_stars` |
| `investigation_clue_placed` | Clue dropped on a suspect's slot in level 4 | `level_id`, `level_number`, `clue_key`, `suspect_id`, `verdict`, `is_tutorial`, … |
| `investigation_completed` | Level 4 ends — culprit identified or revealed; finishes the game | `level_id`, `level_number`, `stars`, `wrong_attempts`, `is_correct`, `revealed` |
| `settings_opened` | Player opens settings menu | `from_screen` |
| `button_clicked` | Semantic UI button clicks | `button_name`, `screen` |
| `survey_submitted` | PostHog survey completed | `$survey_id`, `$survey_name` |
| `survey_dismissed` | PostHog survey dismissed | `$survey_id`, `$survey_name` |

### Backend Events (Authoritative)

| Event Name | Trigger | Properties |
|---|---|---|
| `user_registered` | New account created | `method` (email/oauth) |
| `user_verified` | Email verified | `method` |
| `user_logged_in` | Successful login | `method` |
| `match_ended` | Game session persisted (levels 1–4) | `level_id`, `score`, `stars`, `duration_ms`, `user_id` |
| `$exception` | Unhandled error | `$exception_message`, `$exception_type`, stack trace |

**Naming Convention:** Use `snake_case` with `.` namespacing for game events and `_` separation for product events. Be consistent.

---

## Survey Implementation

### Goal
Display a feedback survey **after the player earns their first star**.

### Why This Timing
- A survey popping up mid-gameplay (while moving or solving a quiz) is terrible UX.
- The `ResultPanel` (level-complete screen) is a natural pause point where the player is already reading their score.
- PostHog surveys render as DOM overlays, so even if the player navigates away quickly, the survey will persist on the next screen.

### Current Implementation Note
> **Inconsistency:** The current codebase uses a hardcoded Google Form link (`navNextUrl`) in `ResultPanel.ts` for the "Dê sua opinião" button instead of a PostHog survey overlay. The `first_star_earned` event is correctly captured and would trigger a PostHog survey if configured in the PostHog UI, but the in-game button currently bypasses PostHog and opens an external Google Form. When ready to switch to PostHog surveys, remove the Google Form link and configure the survey in the PostHog Dashboard with an event-based trigger on `first_star_earned`.

### Implementation Steps

1. **Track First Star in Phaser**

In `ScoreManager` (or wherever star collection happens), when the player earns their first star ever, set a registry flag instead of capturing immediately:

```typescript
// In ScoreManager or star collection logic
const hasEarnedStarBefore = this.scene.registry.get("hasEarnedStarBefore") ?? false;
if (!hasEarnedStarBefore && totalStars > 0) {
  this.scene.registry.set("pendingFirstStarSurvey", true);
  this.scene.registry.set("hasEarnedStarBefore", true);
}
```

2. **Capture Event at ResultPanel**

In `ResultPanel.show()`:

```typescript
import posthog from "posthog-js";

public showResults(
  _score: number,
  _total: number,
  progressTracker: QuizProgressTracker,
  scoreManager: ScoreManager,
) {
  // ... existing logic ...

  // Check for pending first-star survey
  if (this.scene.registry.get("pendingFirstStarSurvey")) {
    const payload = scoreManager.getPayload();
    posthog.capture("first_star_earned", {
      level_id: this.scene.registry.get("currentLevelId"),
      total_score: payload?.totalQuarters ?? 0,
    });
    this.scene.registry.set("pendingFirstStarSurvey", false);
  }

  this.show();
}
```

3. **Configure Survey in PostHog UI**

- Go to PostHog Dashboard > Surveys > Create Survey.
- Set **Display conditions** to: Event-based trigger = `first_star_earned`.
- Set **Targeting** to: All users (or logged-in users only, depending on your survey goal).
- The survey will automatically render when PostHog receives the `first_star_earned` event.

### Edge Cases
- **Player refreshes before ResultPanel:** The `pendingFirstStarSurvey` flag is in Phaser's scene registry, so it survives scene restarts but not full page refreshes. If the player refreshes mid-level, they will re-earn the star, and the flag will be set again. This is acceptable — the survey will trigger on the next level completion.
- **PostHog not loaded:** If PostHog fails to initialize, the `posthog.capture()` call is a no-op (or throws a safe error if not guarded). The game continues unaffected.

### NPS Survey — "Guardião da Cultura" (Issue #584)

**Goal:** Show the NPS survey exactly once, only after the player finishes the intermediate quiz that follows the paintings challenge on level 1 ("segundo andar"). It must not appear before, during, or after any other minigame/quiz, nor on other levels.

**Blocked by:** [#602](https://github.com/Labs-de-Games/gameplate/pull/602) (`feat(front): add gameplay analytics events`).

`intermediate_quiz_completed` already fires today for every minigame quiz (`level_id`, `info_key`, `score`, `total_questions`, `passed`), but `info_key` is a raw content-authoring string from each level's `intermediate-quizzes.json` — not a documented, stable identifier. #602 adds `quiz_number` to this same event specifically to give analytics a stable, level-agnostic way to identify which minigame quiz just completed, and documents it in `EVENTS.md` for the first time.

Per review feedback on #602, the corrected numbering is `sculptures=1, paintings=2, photo=3` (gameplay order), not the alphabetical order originally proposed.

**PostHog Survey trigger, once #602 merges:**
- Trigger: "When an event is captured" → `intermediate_quiz_completed`
- Property filter 1: `level_id = level_01`
- Property filter 2: `quiz_number = 2` (paintings)
- Frequency: "Once ever" (already the current survey setting)

Do not configure this trigger using `info_key` (e.g. `paintings_done`) as a stand-in until #602 lands — that value is a content key, not part of the event's documented contract, and isn't guaranteed to stay the same across levels.

---

## Error Tracking

### Backend: NestJS Interceptor

Already configured in [Backend Implementation](#backend-implementation). The interceptor:
- Uses RxJS `catchError` without interfering with NestJS exception filters.
- Skips already-captured exceptions (deduplication).
- Skips `HttpException`s below `minStatusToCapture` (default 500; configure to 400 if needed).
- Re-throws exceptions after capturing.
- Automatically attaches session context from request headers.

### Frontend: Next.js Global Error Boundary

Already configured in [Frontend Implementation](#frontend-implementation). The `global-error.tsx` catches unhandled client errors and sends them to PostHog with `posthog.captureException(error)`.

### Correlation
Because both frontend and backend use the same PostHog project and the Axios interceptor propagates session headers, you can:
1. Find a `$exception` event in PostHog.
2. View the linked Session Replay to see what the player was doing.
3. See the backend error with the same `session_id` and `distinct_id`.

---

## Testing & Validation

### Before Committing

- [ ] `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_API_KEY` are set in `.env.local` for testing.
- [ ] `front/src/lib/env.ts` and `back/src/core/config/config.service.ts` schemas validate PostHog env vars.
- [ ] Frontend builds without errors (`npm run build` in `front/`).
- [ ] Backend builds without errors (`npm run build` in `back/`).
- [ ] `make lint` passes.
- [ ] `make test` passes.
- [ ] No secrets or credentials in code.

### Manual Validation Checklist

1. **Initialization**
   - [ ] Open browser DevTools Network tab. Confirm `posthog-js` loads and sends `/decide` and `/capture` requests to `us.i.posthog.com`.
   - [ ] Check `posthog.__loaded` is `true`.

2. **Web Analytics**
   - [ ] Navigate between routes (e.g., `/`, `/auth/login`). Confirm `$pageview` events in Network tab or PostHog Live Events.

3. **User Identification**
   - [ ] Log in. Confirm `posthog.identify()` is called (check PostHog debugger or network tab).
   - [ ] Log out. Confirm `posthog.reset()` is called and subsequent events are anonymous.

4. **Session Replay**
   - [ ] Play a level. Confirm canvas is visible in PostHog Session Replay (may take a few minutes to process).
   - [ ] Check replay shows Phaser canvas gameplay, not just a black box.

5. **Session Linking**
   - [ ] Make an API call from the game (e.g., save progress). Confirm `X-PostHog-Session-ID` and `X-PostHog-Distinct-ID` headers are present in the request.
   - [ ] In PostHog, find a backend event (e.g., `match_ended`) and confirm it has the same `session_id` as frontend events.

6. **Survey**
   - [ ] Complete a level and earn at least one star (on a fresh user or after clearing `hasEarnedStarBefore` from registry).
   - [ ] Confirm `first_star_earned` event appears in PostHog Live Events.
   - [ ] Confirm PostHog survey renders on the ResultPanel or next menu screen.

7. **Error Tracking**
   - [ ] Trigger a frontend error (e.g., throw in a component). Confirm it appears in PostHog Error Tracking.
   - [ ] Trigger a backend 500 (if safe in dev). Confirm it appears in PostHog Error Tracking with stack trace.

---

## Rollout Plan

### Phase 1: Foundation (Week 1)
1. Add env vars to `.env.example`, frontend Zod schema, and backend config.
2. Run `npx @posthog/wizard@latest` in `front/`.
3. Implement `PostHogProvider`, `PostHogPageView`, and Axios interceptors.
4. Implement backend `PostHogModule`, `PostHogService`, and `PostHogInterceptor`.
5. Basic smoke test: confirm initialization and `$pageview` tracking.

### Phase 2: Core Events (Week 2)
1. Add `posthog.identify()` / `posthog.reset()` to auth flow.
2. Implement frontend game event captures (`game_started`, `level_completed`, `star_collected`, etc.).
3. Implement backend authoritative events (`user_registered`, `user_logged_in`, `match_ended`).
4. Validate session linking: confirm backend events share `session_id` with frontend.

### Phase 3: Session Replay, Surveys & Feature Flags (Week 3)
1. Enable `record_canvas: true` and validate Session Replay shows Phaser canvas.
2. Implement first-star survey logic in `ScoreManager` and `ResultPanel`.
3. Configure survey in PostHog UI with `first_star_earned` trigger.
4. Create `session_replay_sampling_rate` feature flag in PostHog UI.
5. Implement server-side bootstrapping for authenticated users.
6. Test survey timing and UX.

### Phase 4: Error Tracking & Polish (Week 4)
1. Add frontend `global-error.tsx` with `posthog.captureException()`.
2. Validate backend exception capture via interceptor.
3. Run full `make lint` and `make test`.
4. Monitor PostHog event volume and Session Replay data usage for 1 week.
5. Adjust `session_replay_sampling_rate` feature flag if needed.

---

## Notes

- **Billing:** Canvas recording and explicit event volume can increase costs quickly. Monitor the PostHog usage dashboard weekly after launch. With 5,000 expected annual users, the free tier should be sufficient for some time.
- **Sampling:** Default is 100% for all users (anonymous and authenticated) in Production. If costs spike, adjust the `session_replay_sampling_rate` feature flag rather than hardcoded config.
- **Privacy:** Ensure your PostHog privacy settings and any Terms of Service / Privacy Policy mention analytics and session recording. PostHog provides tools to mask sensitive inputs.
- **Existing Analytics:** The custom `sendGameEvent()` pipeline remains untouched. No changes to `AnalyticsService`, `GameEvent` entities, or existing DB tables.
- **Development:** The `PostHogStub` ensures developers can work locally without network calls or data pollution. Setting a personal PostHog key in `.env.local` switches to real mode for testing.
- **Staging:** Deferred until staging infrastructure is deployed. When ready, create a separate PostHog project and update env vars in `compose.staging.yaml`.
- **Feature Flags:** The `session_replay_sampling_rate` flag is evaluated at page-load only. Mid-session changes do not affect active recordings.
