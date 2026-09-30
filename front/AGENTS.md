# Frontend Agent Guidelines

This document defines frontend-specific conventions for AI agents working in `/front/`. It takes precedence over the root `AGENTS.md` for decisions specific to the Next.js + Phaser frontend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| UI Library | Material UI (MUI) v9 |
| Styling | Emotion (CSS-in-JS) |
| Game Engine | Phaser 4.2 |
| State | React hooks + Zustand |
| HTTP | Axios |
| Auth | Auth.js (`next-auth` v5) |
| Testing | Jest + React Testing Library (jsdom) |

## Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Fix lint | `npx biome check --write` |
| Test | `npm test` |
| Typecheck | `npm run typecheck` |

## Directory Structure

```
front/src/
├── app/                    # Next.js App Router
│   ├── (game)/             # Route group for the landing/game entry (page.tsx)
│   ├── login/, register/, confirm-verification/, reset-institution-password/
│   │                       # Institution auth pages
│   ├── layout.tsx          # Root layout with providers
│   ├── error.tsx           # Error boundary
│   └── global-error.tsx    # Root-level error boundary
├── components/             # React components
│   ├── auth/               # Auth-specific components
│   ├── PhaserGame.tsx      # Phaser bootstrap component
│   └── ...
├── lib/                    # Utilities and business logic
│   ├── api/                # Axios client, error classes, backend health
│   ├── auth/               # Cookies, session sync, password policy
│   ├── *Api.ts             # Feature API clients (badgesApi.ts, scoresApi.ts, ...)
│   ├── env.ts              # Zod-validated environment variables
│   └── theme.ts            # MUI theme configuration
├── ui/                     # In-game React UI (HUD, panels, dialogs)
│   └── state/              # Zustand stores (game-ui-store, dialogue-store)
├── auth.ts, auth.config.ts # Auth.js (next-auth) configuration
├── middleware.ts           # Route protection
└── game/                   # Phaser game domain (isolated from React)
    ├── scenes/             # Game scenes
    ├── objects/            # Game objects, UI panels, managers
    ├── mechanics/          # Game mechanic handlers
    ├── factories/          # Object factories
    ├── data/               # Level configs, mission registry
    └── constants/          # Game constants
```

## Safe Zones — Edit Autonomously

- `/front/src/components/` — React UI components and auth forms
- `/front/src/lib/` — Utility functions, API clients, auth logic, validation schemas
- `/front/src/game/` — Phaser game objects, scenes, mechanics, constants
- `/front/src/ui/` — In-game React UI and its Zustand stores

### Ask-First Zones

- `/front/src/app/layout.tsx` — Root layout changes affect all pages
- `/front/src/app/(game)/page.tsx` — Main game entry page
- `/front/src/app/login/`, `/front/src/app/register/`, `/front/src/app/confirm-verification/`, `/front/src/app/reset-institution-password/` — Auth pages
- `/front/src/middleware.ts` — Route protection logic
- `/front/package.json` — Dependency changes
- `/front/next.config.ts` — Next.js configuration

## Conventions

### Next.js App Router

- Use **Server Components by default**. Only mark components `"use client"` when they need browser APIs, state, or effects.
- Auth pages and Phaser integration require `"use client"`.
- Use `loading.tsx` for loading states where appropriate.
- Use route groups (such as `(game)`) for shared layouts.

### Phaser Integration

- Phaser game logic lives **exclusively** in `/front/src/game/`. Never import Phaser into React components outside the `PhaserGame` bootstrap.
- The React shell (`PhaserGame.tsx`) creates the Phaser instance, passes user data, and forwards API calls.
- Game-to-React communication uses **two parallel channels**: the shared `EventBus` (for event-driven consumers) and a direct Zustand store write via `useGameUIStore.getState().set*()` (for time-sensitive state that must survive React mount-timing races caused by Turbopack module isolation). Phaser scenes that expose UI state must write to **both**.
- Phaser scenes may read from the Zustand store via `useGameUIStore.getState()` at scene start to seed initial state (e.g., reading `progression.completedLevels` when re-entering the map after a completed level).
- Scene transitions, asset loading, and game state are managed inside Phaser scenes, not React.

### Styling (MUI + Emotion)

- Use MUI components (`Box`, `Stack`, `Typography`, `Button`, etc.) for all UI.
- Use the theme from `lib/theme.ts` for colors, spacing, and breakpoints.
- For custom styles, use Emotion's `sx` prop or `styled()` API.
- **Never** use Tailwind CSS, CSS Modules, or inline styles.
- Theme customization goes in `lib/theme.ts`.

### State Management

- React state: `useState`, `useReducer`, `useContext` for local UI state.
- Shared UI state: the existing Zustand stores in `src/ui/state/` (`game-ui-store.ts`, `dialogue-store.ts`). Extend these rather than creating parallel state.
- Auth state: Auth.js (`next-auth`) configured in `src/auth.ts` and `src/auth.config.ts`. Read the session with Auth.js APIs (see `components/auth/InstitutionGuard.tsx`).
- Game state: Managed inside Phaser scenes via `scene.registry` and custom managers.
- **Never** add another state library (Redux, Jotai, etc.) without human approval.

### API Client

- Use the Axios instance from `lib/api/client.ts` for all HTTP requests.
- The client handles auth token attachment, 401 refresh queuing, and PostHog session headers.
- Define API functions in `lib/api/*.ts` or feature `lib/*Api.ts` files (e.g., `lib/api/edital.ts`, `lib/badgesApi.ts`).
- Use Zod schemas for runtime validation of API responses where possible.

### Forms

- Current forms (e.g., `app/register/page.tsx`) use controlled inputs with `useState` and validate on submit. Follow the pattern of the form you are editing.
- Shared validation rules live in `lib/` (e.g., `lib/auth/passwordPolicy.ts`, `lib/edital/dateRangeSchema.ts`) or are co-located with the form.
- MUI `TextField`, `Button`, and form components are the standard; auth pages reuse the building blocks in `components/auth/`.

### Testing

- Co-locate tests with source: `Component.tsx` → `Component.test.tsx`.
- Use React Testing Library for component tests.
- Mock API calls with `jest.mock` or MSW.
- jsdom is the Jest test environment (`jest.config.ts`).

## Patterns

### Adding a New Game Scene

1. Create `front/src/game/scenes/NewScene.ts`
2. Extend `Phaser.Scene` and implement `create()` and `update()`
3. Register the scene in `front/src/game/main.ts`
4. Add scene name to `front/src/game/constants/SceneNames.ts`

### Adding a New Auth Page

1. Create `front/src/app/new-page/page.tsx`
2. Use `"use client"` directive
3. Build the page with `AuthPageShell` and the other components in `components/auth/`
4. Add route protection to `middleware.ts` if needed (ask first)

### Adding a New API Endpoint Consumer

1. Add the endpoint function to the appropriate `lib/api/*.ts` file
2. Define TypeScript interfaces for request/response
3. Handle errors using the custom error classes in `lib/api/errors.ts`
4. Update `lib/env.ts` if new env vars are needed (ask first)

## Implementing from a Design Spec

When implementing a component from a design file (Figma or similar):

- Measure from the component itself, not the full-screen frame: design-tool coordinates are relative to the parent frame.
- Translate the spec into MUI `sx` or `styled()`. Do not copy generated Tailwind or other framework code verbatim.
- Make sure the fonts are loaded before comparing spacing; a fallback font shifts every measurement.
- For multi-state components, collect every state (available, unavailable, completed, etc.) before coding.
- Verify the result in the browser against the spec; allow a few pixels of font-rendering difference.

## Escalation

- **Auth flow changes** → Escalate to human (security-critical)
- **New dependencies** → Escalate to human
- **Phaser version upgrades** → Escalate to human
- **Next.js version upgrades** → Escalate to human
- **Route protection changes** → Escalate to human
