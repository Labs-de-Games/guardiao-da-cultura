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
| `make help` | Lista todos os comandos disponíveis |

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

### Pipeline de CI (Pull Requests)

Executada automaticamente em PRs não-draft. Valida:

1. **Typecheck**: Verificação de tipos TypeScript (`bun run typecheck`)
2. **Lint**: Biome check em todo o workspace (`bun run lint`)
3. **Build**: Compilação do backend e frontend (`bun run build`)
4. **Test**: Testes reais via Bun Test (`bun run test`)

**Critério**: Todos os steps devem passar (exit code 0) para permitir merge.

### Pipeline de CD (Deploy)

Executada automaticamente ao fazer push na branch `main` ou via `workflow_dispatch`.

**Pré-requisito**: O Secret `COOLIFY_WEBHOOK_URL` deve estar configurado.

#### Configurando o Webhook do Coolify (Passo a Passo)

1. **No Coolify Dashboard**:
   - Acesse seu projeto/aplicação
   - Vá em **Settings** ou **Webhooks**
   - Copie a **Webhook URL** (formato: `https://coolify.example.com/api/v1/deploy/webhook/...`)

2. **No GitHub**:
   - Acesse o repositório
   - Vá em **Settings → Secrets and variables → Actions**
   - Clique em **New repository secret**
   - Nome: `COOLIFY_WEBHOOK_URL`
   - Value: Cole a URL copiada do Coolify
   - Salve

3. **Validação**:
   - Faça um push na branch `main`
   - Acesse a aba **Actions** no GitHub
   - Verifique se o workflow **CD** executou com sucesso
   - No Coolify, confirme que o deploy foi iniciado

**Importante**: Se o Secret não estiver configurado, o workflow falhará com mensagem clara indicando os passos necessários.

### Testes

#### Backend (NestJS)

- **Localização**: `back/test/app.e2e.spec.ts`
- **Tipo**: Teste E2E/Integração
- **Valida**: Health check endpoint (`/api/v1/health`)
- **Execução**: `cd back && bun test`

#### Frontend (Next.js)

- **Localização**: `front/src/app/` e `front/src/components/`
- **Tipo**: Testes unitários de componentes
- **Valida**: Renderização de componentes React
- **Execução**: `cd front && bun test`

#### Workspace Root

- **Execução**: `bun run test` (executa todos os testes via Turbo)
- **Makefile**: `make test`

---

## Validação de Produção

### Build Local de Produção

Para validar os builds Docker antes do deploy:

```bash
# Build de todas as imagens de produção
make build-prod

# Ou manualmente:
docker compose -f compose.base.yaml -f compose.production.yaml build
```

### Variáveis de Ambiente Necessárias

Antes de rodar em produção, configure as seguintes variáveis no arquivo `.env` (use `.env.example` como base):

#### Obrigatórias

- `DATABASE_URL`: String de conexão PostgreSQL (ex: `postgresql://user:pass@postgres:5432/dbname`)
- `JWT_SECRET`: Chave secreta para assinatura de tokens JWT
- `POSTGRES_USER`: Usuário do banco de dados
- `POSTGRES_PASSWORD`: Senha do banco de dados
- `POSTGRES_DB`: Nome do banco de dados

#### Opcionais

- `PORT`: Porta do backend (default: `3001`)
- `NODE_ENV`: Ambiente de execução (default: `production`)

### Checklist de Validação

Antes de fazer deploy em produção:

- [ ] Todos os testes passam (`make test`)
- [ ] Build de produção executa sem erros (`make build-prod`)
- [ ] Variáveis de ambiente configuradas no Coolify
- [ ] Webhook do Coolify configurado no GitHub
- [ ] Health checks configurados (`/api/v1/health`)
- [ ] Nginx configurado corretamente (`nginx/nginx.prod.conf`)

### Troubleshooting Comum

**Erro: "COOLIFY_WEBHOOK_URL is not configured"**
- Verifique se o Secret está criado no GitHub (Settings → Secrets)
- Confirme que o nome está exatamente como `COOLIFY_WEBHOOK_URL`

**Erro: "Image not found" no Coolify**
- Verifique se o Dockerfile está no diretório correto
- Confirme que o build context está configurado corretamente
- Revise os logs de build no Coolify para erros específicos

**Erro: "Port already in use"**
- Verifique conflitos de porta no compose.production.yaml
- Confirme que o nginx está mapeando as portas corretamente

---

## Roadmap

- [ ] Domínio de negócio (auth/users)
- [x] Testes reais (E2E backend + unitários frontend)
- [x] Validação de build de produção
- [x] Documentação completa de CI/CD
- [ ] SonarQube + Snyk
- [ ] OpenTelemetry

---

## Notas

- Para simular produção localmente, copie `.env.example` para `.env` e ajuste os valores.
- O workspace usa Bun como runtime exclusivo - não utilize npm ou node diretamente.
- Todos os commits devem seguir Conventional Commits para manter o histórico limpo.
- A pipeline de CI bloqueia merge se houver falhas em testes, lint ou build.