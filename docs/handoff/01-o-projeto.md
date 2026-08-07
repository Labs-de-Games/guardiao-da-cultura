# O projeto

## O que é

**Labs de Games** é um jogo educativo 2D sobre arte e cultura brasileira. O
código fica em `Labs-de-Games/gameplate`, repositório privado.

O nome `gameplate` vem de game mais template e ficou do começo do projeto. Ele
identifica o repositório, não o produto.

Tem duas branches permanentes. `develop` é onde o trabalho se integra: toda
branch nova sai dela e toda Pull Request volta para ela. `master` guarda o que
está em produção e só recebe conteúdo pela Pull Request de release, que mergeia
`develop` inteira de uma vez.

A documentação oficial vive dentro do próprio repositório. Este guia não a
substitui. Quando os dois divergirem, o repositório vence.

| Arquivo no repositório | Cobre |
|---|---|
| `docs/ARCHITECTURE.md` | Arquitetura, domínios e contratos de API |
| `docs/CONTRIBUTING.md` | Fluxo de desenvolvimento |
| `docs/VERSIONING.md` | Processo de release e rollback |
| `docs/CHANGELOG.md` | Histórico por versão |
| `EVENTS.md` | Catálogo de eventos de analytics |
| `AGENTS.md` | Regras para agentes de IA |
| `Makefile` | Todos os comandos, via `make help` |

## Como está montado

```
gameplate/
├── front/          jogo e site
├── back/           API e banco
├── nginx/          proxy reverso por ambiente
├── docs/           documentação oficial
├── .github/        CI, CD e templates de issue
├── .agents/skills/ skills de IA versionadas
├── compose.*.yaml  um por ambiente
├── Makefile        porta de entrada dos comandos
└── turbo.json      pipeline de tarefas
```

O gerenciador de pacotes é **npm workspaces**. Não é pnpm, não é yarn, não é
bun. Existe um `front/bunfig.toml` no repositório, mas é resíduo de uma
tentativa abandonada. O runtime oficial é Node 24.15.0, fixado no CI e nos
Dockerfiles.

## Frontend

```
front/src/
├── app/          rotas do Next.js
├── components/   React fora do jogo
├── lib/          clientes de API, auth, utilidades
└── game/         domínio Phaser
    ├── scenes/
    ├── objects/
    ├── mechanics/
    └── constants/
```

| Camada | Escolha |
|---|---|
| Framework | Next.js com App Router e saída standalone |
| Motor do jogo | Phaser 3.90.0, versão fixa |
| Interface | MUI v9 com Emotion |
| Estado da interface | Zustand |
| Formulários | react-hook-form com Zod |
| HTTP | Axios com interceptors |
| Analytics | posthog-js |

A fronteira entre React e Phaser é um **EventBus tipado**. Componente React não
acessa cena Phaser diretamente, e cena não manipula DOM do React. Quando os dois
disputam o mesmo nó do DOM, o jogo quebra em produção.

## Backend

```
back/src/
├── core/      configuração, banco, e-mail, guards, logs
└── modules/   admin, analytics, auth, badges, game,
               posthog, progression, scoring, users
```

| Camada | Escolha |
|---|---|
| Framework | NestJS com Express |
| Banco | PostgreSQL 16 |
| ORM | TypeORM, migrations por CLI |
| Autenticação | Passport JWT e magic link sem senha |
| Logs | nestjs-pino |
| Documentação de API | Swagger |

Todos os endpoints têm prefixo `/api/v1`. Os contratos completos estão em
`docs/ARCHITECTURE.md`.

Uma regra específica do backend: **não converta imports em `import type`**. A
injeção de dependência do NestJS depende de metadata em tempo de execução, e a
conversão quebra a aplicação. A regra de lint correspondente está desligada de
propósito para `back/src/**`.

## O pivô que você precisa conhecer

Está registrado em `docs/ARCHITECTURE.md` e explica muita coisa no código:

> O frontend faz o trabalho pesado. O backend foi deliberadamente simplificado e
> se restringe a persistência, agregação de analytics e validação de estado
> global que não pode ser confiada ao cliente.

Na prática, a gameplay roda no cliente e sincroniza com o servidor
periodicamente. Ao adicionar lógica de jogo, o padrão é o front.
