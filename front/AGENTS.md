# Frontend Agent Guidelines

This document defines frontend-specific conventions for AI agents working in `/front/`. It takes precedence over the root `AGENTS.md` for decisions specific to the Next.js + Phaser frontend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| UI Library | Material UI (MUI) v9 |
| Styling | Emotion (CSS-in-JS) |
| Game Engine | Phaser 4.2 |
| State | React hooks + Context |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| Testing | Jest + React Testing Library + Happy DOM |

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
│   ├── (auth)/             # Auth route group (login, register, confirm)
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Game page (PhaserGame + AuthGuard)
│   └── error.tsx           # Error boundaries
├── components/             # React components
│   ├── auth/               # Auth-specific components
│   ├── PhaserGame.tsx      # Phaser bootstrap component
│   └── ...
├── lib/                    # Utilities and business logic
│   ├── api/                # Axios client, auth API, error handling
│   ├── auth/               # AuthContext, hooks, cookies, sync
│   ├── env.ts              # Zod-validated environment variables
│   └── theme.ts            # MUI theme configuration
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
- `/front/src/app/(auth)/` — Auth pages and layouts

### Ask-First Zones

- `/front/src/app/layout.tsx` — Root layout changes affect all pages
- `/front/src/app/page.tsx` — Main game page structure
- `/front/src/middleware.ts` — Route protection logic
- `/front/package.json` — Dependency changes
- `/front/next.config.ts` — Next.js configuration

## Conventions

### Next.js App Router

- Use **Server Components by default**. Only mark components `"use client"` when they need browser APIs, state, or effects.
- Auth pages and Phaser integration require `"use client"`.
- Use `loading.tsx` for loading states where appropriate.
- Keep route groups (`(auth)`) for shared layouts.

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

- React state: `useState`, `useReducer`, `useContext` for UI state.
- Auth state: `AuthContext` in `lib/auth/AuthContext.tsx`. Access via `useAuth()` hook.
- Game state: Managed inside Phaser scenes via `scene.registry` and custom managers.
- **Never** add Zustand, Redux, or Jotai without human approval.

### API Client

- Use the Axios instance from `lib/api/client.ts` for all HTTP requests.
- The client handles auth token attachment, 401 refresh queuing, and PostHog session headers.
- Define API functions in `lib/api/*.ts` files (e.g., `auth.ts`, `badgesApi.ts`).
- Use Zod schemas for runtime validation of API responses where possible.

### Forms

- Use `react-hook-form` with `@hookform/resolvers/zod` for all forms.
- Validation schemas live in `lib/auth/validation.ts` or co-located with the form.
- MUI `TextField`, `Button`, and form components are the standard.

### Testing

- Co-locate tests with source: `Component.tsx` → `Component.test.tsx`.
- Use React Testing Library for component tests.
- Mock API calls with `jest.mock` or MSW.
- Happy DOM is the test environment.

## Patterns

### Adding a New Game Scene

1. Create `front/src/game/scenes/NewScene.ts`
2. Extend `Phaser.Scene` and implement `create()` and `update()`
3. Register the scene in `front/src/game/main.ts`
4. Add scene name to `front/src/game/constants/SceneNames.ts`

### Adding a New Auth Page

1. Create `front/src/app/(auth)/new-page/page.tsx`
2. Use `"use client"` directive
3. Wrap with `useRedirectIfAuth()` if it should be guest-only
4. Use MUI components and `react-hook-form` for forms
5. Add route protection to `middleware.ts` if needed

### Adding a New API Endpoint Consumer

1. Add the endpoint function to the appropriate `lib/api/*.ts` file
2. Define TypeScript interfaces for request/response
3. Handle errors using the custom error classes in `lib/api/errors.ts`
4. Update `lib/env.ts` if new env vars are needed (ask first)

## Implementing from Figma (MCP)

When implementing a component from a Figma spec via the MCP server:

1. **Always fetch the node in isolation first.** Use `get_screenshot` with the component's own `nodeId` (not the full-screen frame). This gives the true bounding box and avoids coordinate offset errors from the parent frame.

2. **Figma coordinates are relative to the direct parent frame.** A child at `x=101, y=846` inside `text_box_fase` (which is at `x=33, y=784` inside the 1440px Home frame) does NOT mean 846px from the top of the screen. Always subtract the parent's origin when translating to CSS `top`/`left`.

3. **Convert absolute coordinates to MUI `sx` with ±2px tolerance.** After converting, compare a browser screenshot to the Figma screenshot. Font rendering (Inter, Jockey One loaded via Google Fonts) introduces 1–4px shift versus Figma's engine. Never assume pixel-perfect match without browser verification.

4. **The MCP reference code is Tailwind — convert to MUI `sx`.** The note in the response says "SUPER CRITICAL: convert to target stack." Do not copy Tailwind classes verbatim. Map `absolute top-10 left-12` → `sx={{ position: 'absolute', top: '40px', left: '45px' }}`.

5. **Fonts must be loaded before measuring.** If a font is not in the Next.js layout (via `next/font` or `<link>` in `_document`), the browser falls back to `sans-serif` and all spacing shifts. Verify font loading before closing a spacing investigation.

6. **For multi-state components, find ALL state frames before coding.** Ask the designer for the node IDs of each state (available, unavailable, completed, etc.) and fetch them separately. Do not infer state visuals from a single frame.

## Escalation

- **Auth flow changes** → Escalate to human (security-critical)
- **New dependencies** → Escalate to human
- **Phaser version upgrades** → Escalate to human
- **Next.js version upgrades** → Escalate to human
- **Route protection changes** → Escalate to human
