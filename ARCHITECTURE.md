# Architecture Overview

This document outlines the architectural decisions, structural boundaries, and technology stack for the Gameplate project. It serves as the single source of truth for the system's technical design, replacing older structural drafts to reflect the current, modernized tooling and practical constraints of the project.

## 1. Context & Requirements

### Functional Requirements
The scope of the project is a web-based educational game. Core features include:
- **Free Public Access:** Barrier-free entry for general users.
- **Game Mechanics:** Quiz-based gameplay integrated with thematic content.
- **Progression System:** Levels, achievements, and badges.
- **Thematic Tracks:** Curated content paths focused on art and culture.
- **Role-Based Access:** Distinct areas and permissions for General Users, Educators/Institutions, and Administrators.
- **Institutional Dashboard:** Aggregated data visualization for educators to track player progress.

### Non-Functional Requirements
- **Accessibility:** Native compliance in UI and content design.
- **Performance:** Fast loading times on mobile networks and compatibility with modern browsers.
- **Privacy & Security:** Minimal personal data collection, strict LGPD compliance.
- **Scale:** Moderate complexity, targeting ~5,000 users in the first year without the immediate need for heavy distributed systems.
- **Open-Source Readiness:** The codebase structure must be clean and modular enough to support a future open-source release.

## 2. Domain Architecture

The system is designed around specific business domains. While physically structured as a monolith, logically, these domains remain isolated and communicate via events (Event-Driven Architecture) to prevent tight coupling:

1. **Identity & Access (Auth):** User authentication, session management, and basic identity.
2. **Game Ingestion:** Receives "consummated facts" (events like `LEVEL_COMPLETED`, `ITEM_COLLECTED`) from the frontend via HTTP and dispatches them as internal backend events.
3. **Progression Engine:** Listens to game events to calculate and store the player's rewards (e.g., fractional Stars) and chapter completion status.
4. **Analytics:** Listens to all system events to store raw event logs (append-only) for calculating funnel metrics and dashboards.

## 3. Technology Stack

### Workspace & Tooling
- **Package Manager & Runtime:** [Bun](https://bun.sh/) (replaces npm/yarn/Node for faster execution and dependency management).
- **Monorepo Orchestration:** [Turborepo](https://turbo.build/) for task caching and parallel execution.
- **Linting & Formatting:** [Biome](https://biomejs.dev/) (replaces ESLint and Prettier for unified, fast code validation).
- **Testing:** `bun test` acting as the universal test runner across the workspace.

### Frontend (`/front`)
- **Framework:** Next.js with React.
- **Game Engine:** Phaser 3 (encapsulated entirely within `src/game`).
- **Styling:** Tailwind CSS is planned.

### Backend (`/back`)
- **Framework:** NestJS.
- **Database:** PostgreSQL.
- **ORM:** TypeORM.
- **Infrastructure:** Docker & Docker Compose for local environments; GitHub Actions for building/pushing to GitHub Container Registry (GHCR); Coolify for Deployment (CD).

## 4. Architectural Patterns & Boundaries

### The Modular Monolith Approach
The codebase is structured as a **Modular Monolith**.

- The repository is split top-level into `front/` and `back/`.
- Inside the backend (`/back/src`), features are grouped into logical, domain-driven folders (e.g., `users`, `health`, `database`).
- Inside the frontend (`/front/src`), the web UI and the Phaser game logic (`/game`) are strictly separated. The game communicates with the outer React shell, which in turn communicates with the backend.

### Directory Structure

```text
gameplate/
├── front/
│   ├── src/
│   │   ├── app/              # Next.js App Router (UI, Auth, Future Dashboards)
│   │   ├── components/       # React Components (UI outside the game)
│   │   └── game/             # Game Domain (Phaser 3)
│   │       ├── scenes/
│   │       ├── entities/
│   │       └── services/     # API Clients to send events to the Backend
│
└── back/
    ├── src/
    │   ├── core/             # Global configurations, Guards, Interceptors
    │   │   ├── config/
    │   │   ├── database/
    │   │   └── health/
    │   ├── shared/           # Shared Types, DTOs, and Event Definitions
    │   │   └── events/       # E.g.: GameEventTypes (LEVEL_COMPLETED, etc)
    │   │
    │   ├── modules/          # Our Bounded Contexts (Domains)
    │   │   │
    │   │   ├── users/        # Domain 1: Identity and Access (Auth/Users)
    │   │   │   ├── user.entity.ts
    │   │   │   └── users.module.ts
    │   │   │
    │   │   ├── game/         # Domain 2: Simple Gameplay Ingestion
    │   │   ├── progression/  # Domain 3: Progression Engine (Stars)
    │   │   └── analytics/    # Domain 4: Tracking & Telemetry
    │   │
    │   ├── app.module.ts
    │   └── main.ts
    │
    └── package.json
```

### Simplified Backend Strategy (Current Pivot)
To accelerate development and reduce unnecessary complexity, **the Next.js frontend will handle the heavy lifting for the initial iterations of the game.** 
The NestJS backend will be heavily simplified for now. Its primary responsibilities will be restricted to:
1. Data persistence (TypeORM/PostgreSQL).
2. Analytics aggregation for the Educator/Admin dashboards.
3. Cross-cutting project scaffolding (global state validation that cannot be trusted to the client).

The gameplay itself will operate mostly as a client-side application (Next.js + Phaser) with periodic state synchronization to the backend.

## 5. Pending Architecture Decisions

The following architectural components are intentionally deferred until the foundational structure is solidified:

- **Authentication Module:** The strategy and provider for identity management (e.g., Auth.js vs. custom JWT vs. external provider) are pending. This will impact both `/front` and `/back` identity domains.
- **Observability & Analytics:** The tooling for tracking gameplay events and platform telemetry (e.g., PostHog) is pending evaluation.
- **Shared Contracts:** How to share TypeScript types and interfaces between `/front` and `/back` (e.g., creating a `packages/shared` workspace in Turborepo vs. duplication) is yet to be established.

## 6. API Contracts (Draft)

### Módulo de Identidade & Acesso (Auth)
Responsável pelo fluxo de login e gerenciamento de sessões.

- **`POST /auth/register`**
  - **Descrição:** Realiza o cadastro de novos usuários (Jogador, Instituição ou Admin).
  - **Payload:** `{ "email": "string", "password": "string", "role": "string" }`

- **`POST /auth/login`**
  - **Descrição:** Autentica o usuário e retorna o token de acesso.
  - **Payload:** `{ "email": "string", "password": "string" }`
  - **Resposta:** `{ "access_token": "string", "user": { "id": "uuid", "role": "string" } }`

### Módulo de Progressão (Gameplay)
Gerencia o estado do jogo, selos e pistas coletadas.

- **`GET /progression/state`**
  - **Descrição:** Recupera o estado atual do jogador (andar atual, selos e pistas).

- **`POST /progression/level-complete`**
  - **Descrição:** Registra a conclusão de um andar e salva automaticamente o status de "Selos" e "Pistas".
  - **Payload:** `{ "level_id": "number", "stars": "number", "badges": ["string"], "clues": ["string"] }`

- **`GET /progression/inventory`**
  - **Descrição:** Consulta informações coletadas sobre obras de arte e "O Vândalo" para o Quiz Final.

### Módulo de Analytics & Telemetria
Ingestão de eventos para monitoramento de atividade.

- **`POST /analytics/events`**
  - **Descrição:** Recebe logs de eventos brutos do frontend via HTTPModule.
  - **Payload:** `{ "event_type": "USER_LOGIN" | "LEVEL_COMPLETED", "timestamp": "ISO8601", "metadata": "object" }`

### Módulo de Quiz Final
Validação de conhecimento ao fim da jornada.

- **`POST /quiz/submit`**
  - **Descrição:** Valida se as respostas do jogador coincidem com as informações apresentadas durante as fases.
  - **Payload:** `{ "answers": [{ "question_id": "uuid", "option_id": "uuid" }] }`
  - **Resposta:** `{ "score": "number", "passed": "boolean" }`

### Observações Técnicas

- **Persistência:** Os dados serão armazenados em banco PostgreSQL.
- **Eventos:** O backend utiliza um Internal Event Bus para publicar eventos após a persistência.
- **Segurança:** O NPC Final (Quiz) deve permanecer bloqueado via contrato até que os desafios dos três andares sejam concluídos.
