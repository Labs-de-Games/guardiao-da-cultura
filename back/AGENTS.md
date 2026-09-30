# Backend Agent Guidelines

This document defines backend-specific conventions for AI agents working in `/back/`. It takes precedence over the root `AGENTS.md` for decisions specific to the NestJS + TypeORM backend.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | NestJS |
| Database | PostgreSQL |
| ORM | TypeORM |
| Auth | Passport JWT + Custom Magic Link |
| Validation | class-validator + class-transformer |
| Testing | Jest + ts-jest |
| Logging | Pino (nestjs-pino) |
| Analytics | PostHog Node SDK |

## Commands

| Task | Command |
|------|---------|
| Start dev server | `npm run start:dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Fix lint | `npx biome check --write` |
| Test | `npm test` |
| Typecheck | `npm run typecheck` |
| Run migrations | `npm run migration:run` |
| Generate migration | `npm run migration:generate -- src/core/database/migrations/MigrationName` |
| Revert migration | `npm run migration:revert` |

## Directory Structure

```
back/src/
├── core/                   # Global infrastructure
│   ├── config/             # Zod-validated env config
│   ├── database/           # TypeORM data source, migrations
│   ├── email/              # Email service (mock + nodemailer)
│   ├── guards/             # Global JWT guard
│   ├── health/             # Health check endpoint
│   └── logger/             # Pino logger module
│
├── modules/                # Feature domains (bounded contexts)
│   ├── admin/              # Admin user management
│   ├── analytics/          # Game event ingestion
│   ├── auth/               # Authentication & Authorization
│   ├── badges/             # Badge definitions & user badges
│   ├── campaign-links/     # Campaign links for guest play
│   ├── consent/            # User consent (terms acceptance) records
│   ├── dashboard/          # Public metrics endpoint
│   ├── game/               # Gameplay event ingestion
│   ├── posthog/            # PostHog server-side integration
│   ├── progression/        # Player progression tracking
│   ├── scoring/            # Score & leaderboard management
│   └── users/              # User profiles & roles
│
├── app.module.ts           # Root module
└── main.ts                 # Application bootstrap
```

## Safe Zones — Edit Autonomously

- `/back/src/modules/*/services/` — Business logic services
- `/back/src/modules/*/controllers/` — HTTP controllers
- `/back/src/modules/*/dto/` — Data transfer objects
- `/back/src/modules/*/interfaces/` — TypeScript interfaces
- `/back/src/modules/*/enums/` — Enums and constants
- `/back/src/modules/*/decorators/` — Custom decorators
- `/back/src/modules/*/guards/` — Route guards (non-global)

### Ask-First Zones

- `/back/src/core/database/migrations/` — Migrations affect production data
- `/back/src/modules/*/entities/` — Entity changes require migration planning
- `/back/src/core/config/` — Environment variable schema changes
- `/back/src/core/guards/global-jwt.guard.ts` — Global auth behavior
- `/back/src/main.ts` — Application bootstrap
- `/back/src/app.module.ts` — Root module imports
- `/back/package.json` — Dependency changes

## Conventions

### NestJS Modules

- Each feature domain is a self-contained module under `/back/src/modules/<name>/`.
- Module files follow the naming convention: `<name>.module.ts`.
- Controllers: `<name>.controller.ts`.
- Services: `<name>.service.ts` or `services/*.service.ts` for multiple services.
- DTOs: `dto/*.dto.ts`.
- Entities: `entities/*.entity.ts` or `<name>.entity.ts` at module root.
- Export the module's public API from its root; import other modules via their module class.

### TypeORM Entities

- Entities use TypeORM decorators (`@Entity`, `@Column`, `@ManyToOne`, etc.).
- Primary keys use `@PrimaryGeneratedColumn('uuid')`.
- Timestamps use `@CreateDateColumn()` and `@UpdateDateColumn()`.
- Relations use lazy loading carefully; prefer query builder for complex joins.
- **Never** modify an entity without planning the corresponding migration.

### DTOs and Validation

- All controller inputs use DTOs with `class-validator` decorators.
- Use `@IsString()`, `@IsEmail()`, `@IsOptional()`, `@ValidateNested()` as needed.
- Transform payloads with `class-transformer` (`@Type(() => Dto)`).
- Response DTOs are optional but recommended for consistent API shapes.

### Authentication & Authorization

- The auth module implements passwordless magic-link authentication.
- JWT access tokens expire in 15 minutes. Refresh tokens are opaque strings (7 days).
- Use `@Public()` to skip JWT guard on specific routes.
- Use `@Roles(Role.Admin)` + `RolesGuard` for role-based access.
- Use `@CurrentUser()` decorator to inject the authenticated user.
- **Never** modify JWT secrets, cookie config, or token rotation logic without human approval.

### Services

- Services are injectable (`@Injectable()`) and use constructor injection.
- Keep services focused on a single responsibility.
- Return plain objects or DTOs from service methods, not raw entities (when crossing module boundaries).
- Use NestJS `EventEmitter` for cross-module communication (fire-and-forget events).

### Controllers

- Controllers use `@Controller('path')` with route prefixes.
- Use HTTP method decorators: `@Get()`, `@Post()`, `@Patch()`, `@Delete()`.
- Apply guards at the controller or method level: `@UseGuards(JwtAuthGuard)`.
- Use `@Body()`, `@Param()`, `@Query()` for input extraction.
- Return consistent response shapes; use NestJS `HttpException` for errors.

### Testing

- Co-locate unit tests with source: `service.ts` → `service.spec.ts`.
- Use `@nestjs/testing` `Test.createTestingModule()` for unit tests.
- Mock external services and repositories.
- E2E tests live in `/back/test/` and use the actual app instance.

## Patterns

### Adding a New Module

1. Create directory: `/back/src/modules/<name>/`
2. Create `<name>.module.ts` with `@Module()` decorator
3. Create controller, service, and DTOs as needed
4. Register the module in `/back/src/app.module.ts` (ask first)
5. Add tests: `<name>.service.spec.ts` and `<name>.controller.spec.ts`

### Adding a New API Endpoint

1. Add the route method to the module's controller
2. Create a DTO in `dto/` with validation decorators
3. Implement business logic in the service
4. Add unit tests for the service method
5. Update the API contracts section in `docs/en/ARCHITECTURE.md` and `docs/pt-BR/ARCHITECTURE.md`

### Adding a Database Migration

1. **Ask human first** — migrations affect production data
2. Modify the entity file
3. Generate migration: `npm run migration:generate -- src/core/database/migrations/AddNewField`
4. Review the generated SQL before running
5. Run migration locally: `npm run migration:run`
6. Commit the migration file

### Adding a New Environment Variable

1. Add to `/back/src/core/config/config.service.ts` Zod schema
2. Add to `/.env.example` with a default or placeholder
3. Add to `compose.development.yaml` if needed for local dev
4. Document it with a comment in `/.env.example`; if it enables an optional integration, also describe it under Optional Integrations in `docs/en/ARCHITECTURE.md` and `docs/pt-BR/ARCHITECTURE.md`

## Escalation

- **Entity changes** → Escalate to human (requires migration planning)
- **Auth flow changes** → Escalate to human (security-critical)
- **New dependencies** → Escalate to human
- **Database migration generation** → Escalate to human
- **Global guard/filter/interceptor changes** → Escalate to human
- **CI/CD workflow changes** → Escalate to human
