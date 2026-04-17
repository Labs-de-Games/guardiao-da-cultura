# Especificação do Projeto

Single source of truth para workflow, comandos e estrutura do repositório.

---

## Estrutura

```
/
├── .agents/                    # Prompts e skills de IA
├── AGENTS.md                   # Governança de agentes
├── back/                       # API NestJS
├── front/                      # Next.js + Phaser
├── nginx/                      # Reverse proxy configuration
│   ├── nginx.dev.conf
│   └── nginx.prod.conf
├── Makefile                    # Comandos locais
├── compose.base.yaml           # Shared service definitions
├── compose.development.yaml    # Stack local
├── compose.production.yaml     # Stack produção (Coolify)
└── package.json                # Workspace root (Bun)
```

---

## Stack

- **Runtime**: Bun
- **Frontend**: Next.js + React + Phaser
- **Backend**: NestJS
- **Lint/Format**: Biome
- **Reverse Proxy**: nginx (alpine)

---

## Comandos (Makefile)

| Comando | Descrição |
|---------|-----------|
| `make dev` | Sobe ambiente local com hot reload |
| `make lint` | Roda Biome (lint + format) |
| `make test` | Roda testes via Bun |
| `make build-prod` | Valida build de produção |

---

## Workflow

1. **Branch**: curta a partir de `main` (ex: `feat/42-auth-login`)
2. **Commit**: Conventional Commits (`feat(scope): descrição`)
3. **PR**: abra para `main`, aguarde CI verde
4. **Merge**: push em `main` dispara CD

### Hooks

- `pre-commit`: Biome check
- `commit-msg`: commitlint valida formato

---

## CI/CD

- **CI**: PR → lint, build, test
- **CD**: push `main` → webhook Coolify

---

## Roadmap

- [ ] Domínio de negócio (auth/users)
- [ ] Testes reais (substituir placeholders)
- [ ] SonarQube + Snyk
- [ ] OpenTelemetry
