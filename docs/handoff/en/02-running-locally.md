# Running locally

## Setup

```bash
git clone git@github.com:Labs-de-Games/gameplate.git
cd gameplate
npm ci
cp .env.example .env
make up
make db-migrate
```

`npm ci` also installs the husky hooks through the `prepare` script.

## Commands

Use these exactly. `AGENTS.md` states this as a rule: do not guess alternatives.

| Task | Command |
|---|---|
| Start with Docker | `make up` |
| Start natively with Turborepo | `make local-all` |
| Start one side | `make local-front` or `make local-back` |
| Stop | `make down` |
| Logs | `make logs` |
| Lint | `make lint` |
| Fix lint | `npm run lint:fix` |
| Typecheck | `npm run typecheck` |
| Test | `make test` |
| Lint and test | `make check` |
| Run migrations | `make db-migrate` |
| Create migration | `make db-migrate-generate NAME=MigrationName` |
| Reset containers and volumes | `make clean` |
| Reset everything | `make deep-clean` |
| Reinstall node_modules | `make sync` |
| List all targets | `make help` |

`make local-all` needs a PostgreSQL instance you provide. `make up` includes one.

## Environment variables

`.env.example` is complete and commented. Never commit `.env`.

Three rules that cause real bugs when broken:

**Anything prefixed `NEXT_PUBLIC_` is not secret.** It ships in the browser
bundle.

**`NEXT_PUBLIC_` values are baked at build time.** Changing them in Coolify has
no effect. The image must be rebuilt.

**`RESPONSIVEVOICE_API_KEY` must not gain the `NEXT_PUBLIC_` prefix.** It is
server only, read by the `/api/tts/synthesize` route handler. It is also not
passed by any CD workflow, so it exists only in the Coolify runtime. It is
optional: leave `RESPONSIVEVOICE_API_KEY=` empty, as in `.env.example`, and the
route answers `503` (`tts_unavailable`), so narration uses the browser's Web
Speech API. Do not use a placeholder such as `xxxxxxxx`. The route treats any
value as a real key and answers `502` on every line.

**The browser voice depends on the system.** Without the key, narration comes
from the browser's own speech synthesizer, which does not always work out of
the box. Some systems, notably Linux, need a speech engine installed at the OS
level, or the browser started with a specific flag or setting. To check, run
`speechSynthesis.getVoices()` in the browser console. An empty list means there
are no voices and narration will be silent.

For local development, `EMAIL_PROVIDER=mock` prints the login magic link to the
console instead of sending mail.

## Tooling

| Tool | Notes |
|---|---|
| Biome | Lint and format. Not ESLint, not Prettier |
| TypeScript | `strict: true`, no `any` |
| Jest | Both workspaces |
| husky | pre-commit, commit-msg, pre-push hooks |

`pre-commit` is skipped entirely only when `npx` is missing. The lint-staged
step tolerates an absent dependency tree and just warns, but the typecheck step
does not: without `node_modules` it fails and blocks the commit. Run `npm ci`
after cloning, before your first commit.

`git commit --no-verify` bypasses the hooks. CI still runs the same checks, so
this is for cases where the hook does not apply, such as a documentation only
commit.

## Turborepo pipeline

| Task | dependsOn | Cached |
|---|---|---|
| `build` | `^build` | yes |
| `lint` | none | yes |
| `typecheck` | none | yes |
| `test` | `build` | yes |
| `dev` | none | no, persistent |

`test` depends on `build`, so running tests triggers a build first.

## Failure modes

| Symptom | Cause and fix |
|---|---|
| Port 3000, 3001 or 5432 in use | Stop the conflicting service or edit `compose.development.yaml` |
| Odd dependency error | `make sync` |
| Container in a bad state | `make clean && make up` |
| Nothing works | `make deep-clean && make up` |
| Migration did not apply | Check the back container is up with `make development-ps` |
| Docker build fails from `front/` | Build context is the monorepo root, not the workspace directory |
| Narration is silent | The browser has no voices. Check whether `speechSynthesis.getVoices()` is empty, then install or enable a speech engine |
| `/api/tts/synthesize` returns `502` | Invalid ResponsiveVoice key (for example `xxxxxxxx`). Leave `RESPONSIVEVOICE_API_KEY=` empty and restart the front |
