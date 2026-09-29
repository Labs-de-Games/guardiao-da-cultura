# Plano de Integração do PostHog

## Visão geral

> **Parcialmente substituído pela issue #864 (consentimento de analytics).** Duas coisas
> neste documento deixaram de ser verdade e estão corrigidas no próprio texto abaixo: o Session Replay e
> a gravação de canvas estão **desativados** (fora de escopo, conforme a #864), e o PostHog
> **só é inicializado depois que o jogador dá consentimento**. Trate toda afirmação de "ativado por
> padrão" aqui como uma descrição do design anterior à #864.

Este documento descreve o plano de implementação para integrar o PostHog ao monorepo Gameplate. Ativamos **Product Analytics**, **Web Analytics** e **Surveys** tanto no frontend em Next.js quanto no backend em NestJS. ~~Session Replay (com gravação de canvas)~~ — removido pela #864.

**Instância do PostHog:** PostHog Cloud (região US)  
**Estrutura de projeto:** Um único projeto compartilhado entre frontend e backend  
**Autocapture:** Desativado explicitamente para evitar ruído do canvas  
**Vínculo de sessão:** Propagação completa de sessão client-servidor via headers do Axios  

---

## Índice

1. [Decisões e justificativas](#decisões-e-justificativas)
2. [Estratégia de ambientes](#estratégia-de-ambientes)
3. [Variáveis de ambiente](#variáveis-de-ambiente)
4. [Implementação no frontend](#implementação-no-frontend)
5. [Implementação no backend](#implementação-no-backend)
6. [Feature flags](#feature-flags)
7. [Taxonomia de eventos](#taxonomia-de-eventos)
8. [Implementação de surveys](#implementação-de-surveys)
9. [Rastreamento de erros](#rastreamento-de-erros)
10. [Testes e validação](#testes-e-validação)
11. [Plano de rollout](#plano-de-rollout)

---

## Decisões e justificativas

### 1. PostHog Cloud na região US
Vamos usar o PostHog Cloud na região US. O wizard do PostHog (`npx @posthog/wizard@latest`) será usado para a configuração automática do frontend em Next.js. O backend em NestJS exige integração manual usando `posthog-node`.

### 2. Mesmo projeto para frontend e backend
Frontend e backend vão compartilhar a mesma chave de API do projeto no PostHog. Isso permite perfis de usuário unificados, funis entre sistemas e eventos de backend vinculados à sessão.

### 3. Estratégia de analytics em paralelo (híbrida)
**Não** vamos substituir o pipeline de analytics customizado `sendGameEvent()` existente. O PostHog roda em paralelo:
- **Analytics customizado** (`POST /api/v1/events`) continua persistindo entities `GameEvent` no PostgreSQL para queries específicas do jogo (leaderboards, histórico de partidas, estatísticas de jogador).
- **PostHog** recebe eventos de product analytics de alto valor tanto do frontend (interações de UI, marcos do jogo) quanto do backend (ciclo de vida de auth, conclusões no servidor).

Isso preserva a infraestrutura de dados do jogo existente e ao mesmo tempo acrescenta insights de produto.

### 4. Autocapture desativado
`autocapture` é definido como `false` na inicialização do `posthog-js`. Um jogo em Phaser num Canvas HTML5 gera milhares de eventos de clique sem nenhum significado semântico. Em vez disso, contamos com **chamadas `posthog.capture()` explícitas e ricas** para cada interação relevante.

### 5. Identificação antecipada do usuário (Opção A)
- `posthog.identify(user.id)` é chamado imediatamente após login/cadastro.
- `posthog.reset()` é chamado no logout.
- O `distinct_id` é o UUID do usuário no backend (não um dado pessoal como o email).
- Isso permite coortes de retenção corretas, funis de conversão (anônimo -> cadastrado -> jogador ativo) e Session Replay vinculado.

### 6. Gravação de canvas — REMOVIDA (#864)
~~`record_canvas: true` é ativado na inicialização do `posthog-js`.~~

A issue #864 coloca session replay, gravação de sessão e captura de canvas fora do
escopo. `posthog.init()` agora passa `disable_session_recording: true` e não define
nem `record_sessions_percent` nem `record_canvas`.

### 7. Vínculo de sessão via interceptors do Axios
Para vincular eventos do backend às sessões do frontend:
- A instância do Axios no frontend vai injetar os headers `X-PostHog-Session-ID` e `X-PostHog-Distinct-ID` em toda requisição à API.
- O `PostHogInterceptor` do NestJS lê esses headers e os propaga via `AsyncLocalStorage` para todas as chamadas `posthog.capture()` dentro daquela requisição.
- Isso permite linhas do tempo de sessão unificadas entre interações no frontend e chamadas à API do backend.

### 8. Web Analytics com PostHogPageView (App Router do Next.js)
Como o App Router do Next.js não emite `router.events`, vamos usar o padrão do PostHog: um componente `PostHogPageView` envolvido em `<Suspense>` que chama `posthog.capture('$pageview')` a cada mudança de `usePathname()`.

### 9. Eventos autoritativos no servidor (Opção B)
O backend é a fonte da verdade para eventos críticos de ciclo de vida:
- `user_registered`, `user_verified`, `user_logged_in`
- Eventos de conclusão de jogo (`match_ended`)

O frontend captura interações de UI (`button_clicked`, `settings_opened`, `game_started`). Evite contagem dupla garantindo que o mesmo evento não seja capturado dos dois lados.

### 10. Rastreamento de erros no frontend e no backend
- **Backend:** `PostHogInterceptor` com `captureExceptions: true`. Captura erros 5xx automaticamente, com stack traces e contexto de sessão.
- **Frontend:** `posthog.captureException(error)` num error boundary global do Next.js (`error.tsx` ou `global-error.tsx`).
- Isso fornece correlação completa de erros: assista ao Session Replay que antecede um 500 do backend.

---

## Estratégia de ambientes

O comportamento do PostHog difere entre **Development**, **Staging** e **Production** para evitar poluição de dados, controlar custos e oferecer uma superfície de teste segura.

### Development (`development`)

**Objetivo:** Zero ruído no PostHog. Por padrão, desenvolvedores não devem enviar eventos de localhost para o PostHog.

- **Inicialização:** O PostHog fica **desativado** a menos que `NEXT_PUBLIC_POSTHOG_KEY` (frontend) ou `POSTHOG_API_KEY` (backend) esteja definida explicitamente no `.env.local`.
- **Modo stub:** Quando nenhuma chave está definida, um `PostHogStub` substitui o client real. Ele registra no console todas as chamadas `capture()`, `identify()`, `reset()` e `captureException()`, com os payloads completos dos eventos. Nenhuma requisição de rede é enviada. O stub também expõe `get_session_id()` e `get_distinct_id()` para que os interceptors do Axios e a lógica de vínculo de sessão continuem funcionando sem erros.
- **Session Replay:** Desativado.
- **Surveys:** Desativados.
- **Rastreamento de erros:** Desativado.
- **Modo debug:** Quando um desenvolvedor define explicitamente uma chave de projeto pessoal do PostHog, `posthog.debug()` é ativado para registrar todos os eventos no console do navegador.
- **Destino dos dados:** Se um desenvolvedor quiser testar contra o PostHog real, ele cria um projeto pessoal no PostHog e usa a chave dele localmente. Nunca use as chaves de Production ou Staging no desenvolvimento do dia a dia.

### Staging (`staging`) — Adiado

A integração do PostHog em staging está documentada aqui, mas **ainda não foi implementada**. Quando staging for implantado:

- **Inicialização:** Ativa. Usa o **projeto de Staging no PostHog** (separado do de Production).
- **Session Replay:** **Desativado** (#864).
- **Surveys:** Ativados (`opt_in_site_apps: true`). Os surveys são configurados no projeto de Staging do PostHog e segmentam apenas URLs de staging. O QA pode validar o fluxo de surveys sem afetar os dados de Production.
- **Rastreamento de erros:** Ativado. Captura exceções tanto no frontend quanto no backend.
- **Feature flags:** Seguro para testar porcentagens de rollout e segmentação.
- **Destino dos dados:** Projeto de Staging no PostHog. Os eventos são marcados com `environment: "staging"`.

### Production (`production`)

**Objetivo:** Conjunto completo de funcionalidades.

- **Inicialização:** Ativa. Usa o **projeto de Production no PostHog**.
- **Session Replay:** **Desativado** (#864).
- **Consentimento:** O PostHog só é inicializado depois que o jogador aceita o banner de dados de uso. Antes disso não há `distinct_id`, nenhum cookie ou entrada de localStorage do PostHog e nenhum evento — e nada de antes da decisão é enviado depois.
- **Surveys:** Ativados (`opt_in_site_apps: true`). Os surveys estão no ar para jogadores reais.
- **Rastreamento de erros:** Ativado. `minStatusToCapture` continua em `500` por padrão (pode ser reduzido para `400` se necessário).
- **Destino dos dados:** Projeto de Production no PostHog. Os eventos são marcados com `environment: "production"`.

### Propriedade de ambiente

Todo evento capturado, tanto no frontend quanto no backend, precisa incluir uma super property `environment`:

- **Frontend:** Definida uma vez durante o `posthog.init` via callback `loaded` ou `superProperties`.
- **Backend:** Definida em toda chamada `capture()` ou via um serviço wrapper: `properties: { environment: config.nodeEnv }`.

Isso permite filtrar os insights no PostHog por `environment = 'production'` ou `environment = 'staging'`.

### Configuração recomendada de projetos no PostHog

| Ambiente | Projeto no PostHog | Finalidade | Status |
|---|---|---|---|
| Development | Nenhum (desativado) ou projeto pessoal de dev | Evitar poluição de dados | Ativo |
| Staging | Projeto dedicado "Gameplate Staging" | QA, teste de surveys, validação de feature flags | Adiado |
| Production | Projeto dedicado "Gameplate Production" | Analytics de jogadores reais, surveys, replays | Ativo |

**Justificativa para projetos separados:** O preço do PostHog é baseado em volume de eventos. A automação de QA e os testes manuais em staging inflariam a contagem de eventos de Production. Projetos separados também evitam que surveys de staging apareçam para usuários reais e mantêm os erros de staging fora dos alertas de Production.

---

## Variáveis de ambiente

### `.env.example` da raiz (adicione estas)

```bash
# PostHog (same project for frontend and backend)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

### Frontend (`front/src/lib/env.ts`)

Adicione ao schema do Zod:

```typescript
NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
NEXT_PUBLIC_POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
```

> **Nota:** `NEXT_PUBLIC_POSTHOG_KEY` é `.optional()` para que o `PostHogStub` seja usado automaticamente no desenvolvimento local quando nenhuma chave estiver definida.

### Backend (`back/src/core/config/config.service.ts`)

Adicione ao schema do Zod:

```typescript
POSTHOG_API_KEY: z.string().optional(),
POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
```

> **Nota:** `POSTHOG_API_KEY` é `.optional()` para que o PostHog fique silenciosamente desativado no desenvolvimento local quando nenhuma chave estiver definida.

**Nota:** A chave de API do projeto (`phc_...`) é uma chave pública somente de escrita. É seguro usá-la tanto no frontend quanto no backend. Nunca use uma chave de API pessoal no código da aplicação.

**Exceção (adicionada pela #738/#748):** a Query API em HogQL do dashboard do edital
(`front/src/lib/edital/server/hogql.ts`) de fato exige uma chave de API
**pessoal** com escopo `query:read` — a chave de projeto acima não consegue rodar
HogQL arbitrário. Essa chave (`POSTHOG_PERSONAL_API_KEY`) fica restrita a
arquivos que fazem `import "server-only"` (garantido em tempo de build — `server-only`
lança erro se um módulo desses for parar no bundle do código do client), é lida
apenas através do `env-server.ts` e nunca pode aparecer numa variável `NEXT_PUBLIC_*`
nem num build arg do Docker (esses ficam visíveis, respectivamente, na imagem gerada e
no bundle do navegador). Os caminhos da chave de escrita e da chave de leitura nunca
compartilham código nem um getter de config — veja `back/src/modules/posthog/*`, que
esta exceção não altera.

---

## Implementação no frontend

### 1. Instalar o PostHog

```bash
cd front
npm install posthog-js
```

### 2. Criar o provider do PostHog

Crie `front/src/components/PostHogProvider.tsx`:

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
      // record_canvas / record_sessions_percent removed by #864.
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

Crie `front/src/lib/posthogStub.ts`:

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

### 3. Criar o componente PostHogPageView

Crie `front/src/components/PostHogPageView.tsx`:

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

### 4. Atualizar o root layout

Em `front/src/app/layout.tsx`, envolva o app com o `PostHogProvider` e adicione o `PostHogPageView`:

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

### 5. Atualizar a instância do Axios com os headers de sessão

No arquivo de setup do Axios (ex.: `front/src/lib/api/client.ts` ou onde quer que o Axios esteja configurado):

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

### 6. Identificar o usuário no login / fazer reset no logout

No fluxo de auth (`front/src/lib/auth/AuthContext.tsx` ou similar):

```typescript
import posthog from "posthog-js";

// After successful login
posthog.identify(user.id);

// On logout
posthog.reset();
```

### 7. Error boundary global (rastreamento de erros no frontend)

Crie `front/src/app/global-error.tsx`:

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

Adicione também `posthog.captureException(error)` a todos os boundaries `error.tsx` existentes.

---

## Implementação no backend

### 1. Instalar o PostHog

```bash
cd back
npm install posthog-node
```

### 2. Criar o módulo do PostHog

Crie `back/src/modules/posthog/posthog.module.ts`:

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

Crie `back/src/modules/posthog/posthog.service.ts`:

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

> **Nota:** Adicione os getters `posthogApiKey` e `posthogHost` ao seu `ConfigService`, com base nas env vars validadas pelo Zod.

### 3. Registrar o PostHogInterceptor globalmente

Em `back/src/main.ts`:

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

### 4. Injetar o PostHog em controllers/services

Exemplo num controller:

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

O `PostHogInterceptor` lê automaticamente `X-PostHog-Session-ID` e `X-PostHog-Distinct-ID` das requisições recebidas e os propaga. Se você passar um `distinctId` explicitamente no `capture()`, ele será usado; caso contrário, o interceptor recorre ao valor do header.

---

## Feature flags

### Primeira flag: `session_replay_sampling_rate`

Esta flag controla a porcentagem de sessões gravadas. Ela serve como um **mecanismo de ajuste de emergência** e valida o pipeline de feature flags sem mexer na lógica do jogo.

**Valores:**
- `1.0` (100%) — Padrão no lançamento. Todas as sessões são gravadas.
- `0.5` (50%) — Reduzir se o volume de dados de replay for maior que o esperado.
- `0.1` (10%) — Redução agressiva para controle de custos.
- `0.0` (0%) — Kill switch de emergência. Nenhuma sessão nova é gravada.

**Avaliação:** Apenas no carregamento da página. Quando uma sessão começa a ser gravada, ela continua até a aba ser fechada. Mudar a flag no PostHog só afeta sessões novas.

### Frontend: flags com bootstrap

Para evitar flicker (quando a taxa de amostragem padrão vale antes de as flags serem buscadas), as flags recebem **bootstrap a partir do servidor** para usuários autenticados.

**Por que bootstrap:** O início da sessão é o momento mais crítico para capturar (navegação pelo menu, experiência do primeiro acesso). Perder os primeiros 5 segundos por causa da busca de uma flag anula o propósito.

**Fluxo de bootstrap:**
1. O usuário faz login. O servidor conhece o `user.id`.
2. O `PostHogProvider` busca `/api/v1/posthog/bootstrap` depois do mount.
3. A resposta contém o `distinctId` do usuário e as `featureFlags` avaliadas.
4. `posthog.init()` usa esses valores de bootstrap imediatamente e depois atualiza em segundo plano.

**Usuários anônimos:** ~~O jogo exige login para jogar~~ — substituído pela #738 (apenas jogo como convidado) e pela #864. Antes de o jogador dar consentimento, a chamada de bootstrap omite o `distinct_id` dele e o backend resolve `guest_play_enabled` usando o id constante do lado do servidor.

**Implementação no `PostHogProvider`:**

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

// NOTE (#864): the snippet below is the pre-consent-era design. The live code
// gates `init()` on consent and passes `disable_session_recording: true`
// instead of any `record_*` option. See front/src/components/PostHogProvider.tsx.
posthog.init(key, {
  api_host: host || "https://us.i.posthog.com",
  autocapture: false,
  capture_pageview: false,
  disable_session_recording: true,
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

### Backend: avaliação de flags

A avaliação de flags no servidor usa o `getAllFlags` do `posthog-node` por questão de performance. Ele aproveita a avaliação local quando há definições de flags em cache e recorre à avaliação remota de forma transparente:

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

O `PostHogInterceptor` propaga o `distinct_id` do usuário a partir dos headers da requisição, então as flags podem ser avaliadas para o usuário certo sem contexto extra.

---

## Taxonomia de eventos

### Eventos do frontend (captura explícita)

> O `EVENTS.md` na raiz do repositório é o catálogo de eventos atualizado; esta
> tabela é o plano original, atualizada apenas para os eventos que os dashboards
> do edital leem (#834).

| Nome do evento | Gatilho | Propriedades |
|---|---|---|
| `$pageview` | Mudança de rota | `$current_url`, `$referrer` |
| `game_started` | O jogador clica em "Jogar" / o nível carrega | `level_id`, `level_number` |
| `level_completed` | O nível termina com sucesso | `level_id`, `level_number`, `score`, `stars`, `time_spent_ms`, `attempts` |
| `level_failed` | O nível termina sem sucesso | `level_id`, `score`, `time_spent_ms`, `reason` |
| `star_collected` | O jogador coleta um colecionável (estrela, pista etc.) | `level_id`, `collectible_id`, `collectible_type`, `total_collected`, `total_available` |
| `first_star_earned` | **Primeira estrela de todas** conquistada, capturada no ResultPanel | `level_id`, `total_score` |
| `badge_earned` | O jogador conquista uma badge | `badge_id`, `badge_name`, `level_id` |
| `quiz_completed` | O minigame de quiz termina | `quiz_id`, `score`, `correct_answers`, `total_questions` |
| `clue_used` | O jogo mostra uma dica automaticamente (não é uma ação do jogador; não é usado pelos dashboards do edital) | `level_id`, `clue_index` |
| `investigation_opened` | A tela do nível 4 (investigação) abre | `level_id`, `level_number`, `collected_clues`, `shown_clues`, `previous_stars` |
| `investigation_clue_placed` | Pista solta no slot de um suspeito no nível 4 | `level_id`, `level_number`, `clue_key`, `suspect_id`, `verdict`, `is_tutorial`, … |
| `investigation_completed` | O nível 4 termina — culpado identificado ou revelado; encerra o jogo | `level_id`, `level_number`, `stars`, `wrong_attempts`, `is_correct`, `revealed` |
| `settings_opened` | O jogador abre o menu de configurações | `from_screen` |
| `button_clicked` | Cliques semânticos em botões da UI | `button_name`, `screen` |
| `survey_submitted` | Survey do PostHog concluído | `$survey_id`, `$survey_name` |
| `survey_dismissed` | Survey do PostHog dispensado | `$survey_id`, `$survey_name` |

### Eventos do backend (autoritativos)

| Nome do evento | Gatilho | Propriedades |
|---|---|---|
| `user_registered` | Nova conta criada | `method` (email/oauth) |
| `user_verified` | Email verificado | `method` |
| `user_logged_in` | Login bem-sucedido | `method` |
| `match_ended` | Sessão de jogo persistida (níveis 1–4) | `level_id`, `score`, `stars`, `duration_ms`, `user_id` |
| `$exception` | Erro não tratado | `$exception_message`, `$exception_type`, stack trace |

**Convenção de nomes:** Use `snake_case` com namespacing por `.` para eventos do jogo e separação por `_` para eventos de produto. Seja consistente.

---

## Implementação de surveys

### Objetivo
Exibir um survey de feedback **depois que o jogador conquista a primeira estrela**.

### Por que este momento
- Um survey aparecendo no meio do gameplay (enquanto o jogador se move ou resolve um quiz) é uma UX péssima.
- O `ResultPanel` (tela de nível concluído) é um ponto de pausa natural, em que o jogador já está lendo a pontuação.
- Os surveys do PostHog são renderizados como overlays no DOM, então mesmo que o jogador saia rápido da tela, o survey persiste na próxima.

### Nota sobre a implementação atual
> **Inconsistência:** O código atual usa um link fixo para um Google Form (`navNextUrl`) no `ResultPanel.ts` para o botão "Dê sua opinião", em vez de um overlay de survey do PostHog. O evento `first_star_earned` é capturado corretamente e dispararia um survey do PostHog se ele estivesse configurado na UI do PostHog, mas o botão dentro do jogo hoje ignora o PostHog e abre um Google Form externo. Quando for a hora de migrar para os surveys do PostHog, remova o link do Google Form e configure o survey no Dashboard do PostHog com um gatilho baseado em evento em `first_star_earned`.

### Etapas de implementação

1. **Rastrear a primeira estrela no Phaser**

No `ScoreManager` (ou onde quer que a coleta de estrelas aconteça), quando o jogador conquistar a primeira estrela de todas, defina uma flag no registry em vez de capturar na hora:

```typescript
// In ScoreManager or star collection logic
const hasEarnedStarBefore = this.scene.registry.get("hasEarnedStarBefore") ?? false;
if (!hasEarnedStarBefore && totalStars > 0) {
  this.scene.registry.set("pendingFirstStarSurvey", true);
  this.scene.registry.set("hasEarnedStarBefore", true);
}
```

2. **Capturar o evento no ResultPanel**

Em `ResultPanel.show()`:

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

3. **Configurar o survey na UI do PostHog**

- Vá em PostHog Dashboard > Surveys > Create Survey.
- Defina as **Display conditions** como: gatilho baseado em evento = `first_star_earned`.
- Defina o **Targeting** como: All users (ou apenas usuários logados, dependendo do objetivo do survey).
- O survey será renderizado automaticamente quando o PostHog receber o evento `first_star_earned`.

### Casos de borda
- **O jogador recarrega antes do ResultPanel:** A flag `pendingFirstStarSurvey` fica no scene registry do Phaser, então ela sobrevive a reinícios de cena, mas não a um refresh completo da página. Se o jogador recarregar no meio do nível, ele vai conquistar a estrela de novo, e a flag será definida novamente. Isso é aceitável — o survey vai disparar na próxima conclusão de nível.
- **PostHog não carregado:** Se o PostHog falhar ao inicializar, a chamada `posthog.capture()` não faz nada (ou lança um erro seguro, se não estiver protegida). O jogo continua sem ser afetado.

### Survey de NPS — "Guardião da Cultura" (Issue #584)

**Objetivo:** Mostrar o survey de NPS exatamente uma vez, apenas depois que o jogador termina o quiz intermediário que vem depois do desafio das pinturas no nível 1 ("segundo andar"). Ele não pode aparecer antes, durante ou depois de nenhum outro minigame/quiz, nem em outros níveis.

**Bloqueado por:** [#602](https://github.com/Labs-de-Games/gameplate/pull/602) (`feat(front): add gameplay analytics events`).

`intermediate_quiz_completed` já dispara hoje para todo quiz de minigame (`level_id`, `info_key`, `score`, `total_questions`, `passed`), mas `info_key` é uma string crua de autoria de conteúdo vinda do `intermediate-quizzes.json` de cada nível — não um identificador documentado e estável. A #602 adiciona `quiz_number` a esse mesmo evento especificamente para dar ao analytics uma forma estável e independente de nível de identificar qual quiz de minigame acabou de ser concluído, e o documenta no `EVENTS.md` pela primeira vez.

Conforme o feedback de revisão na #602, a numeração corrigida é `sculptures=1, paintings=2, photo=3` (ordem do gameplay), e não a ordem alfabética proposta originalmente.

**Gatilho do survey no PostHog, quando a #602 for mergeada:**
- Gatilho: "When an event is captured" → `intermediate_quiz_completed`
- Filtro de propriedade 1: `level_id = level_01`
- Filtro de propriedade 2: `quiz_number = 2` (pinturas)
- Frequência: "Once ever" (já é a configuração atual do survey)

Não configure este gatilho usando `info_key` (ex.: `paintings_done`) como substituto até a #602 entrar — esse valor é uma chave de conteúdo, não faz parte do contrato documentado do evento e não há garantia de que continue igual entre os níveis.

---

## Rastreamento de erros

### Backend: interceptor do NestJS

Já configurado em [Implementação no backend](#implementação-no-backend). O interceptor:
- Usa o `catchError` do RxJS sem interferir nos exception filters do NestJS.
- Ignora exceções já capturadas (deduplicação).
- Ignora `HttpException`s abaixo de `minStatusToCapture` (padrão 500; configure para 400 se necessário).
- Relança as exceções depois de capturá-las.
- Anexa automaticamente o contexto de sessão a partir dos headers da requisição.

### Frontend: error boundary global do Next.js

Já configurado em [Implementação no frontend](#implementação-no-frontend). O `global-error.tsx` captura erros não tratados no client e os envia ao PostHog com `posthog.captureException(error)`.

### Correlação
Como frontend e backend usam o mesmo projeto no PostHog e o interceptor do Axios propaga os headers de sessão, você consegue:
1. Encontrar um evento `$exception` no PostHog.
2. Ver o Session Replay vinculado para entender o que o jogador estava fazendo.
3. Ver o erro do backend com o mesmo `session_id` e `distinct_id`.

---

## Testes e validação

### Antes de commitar

- [ ] `NEXT_PUBLIC_POSTHOG_KEY` e `POSTHOG_API_KEY` estão definidas no `.env.local` para teste.
- [ ] Os schemas de `front/src/lib/env.ts` e `back/src/core/config/config.service.ts` validam as env vars do PostHog.
- [ ] O frontend faz build sem erros (`npm run build` em `front/`).
- [ ] O backend faz build sem erros (`npm run build` em `back/`).
- [ ] `make lint` passa.
- [ ] `make test` passa.
- [ ] Nenhum segredo ou credencial no código.

### Checklist de validação manual

1. **Inicialização**
   - [ ] Abra a aba Network do DevTools do navegador. Confirme que o `posthog-js` carrega e envia requisições `/decide` e `/capture` para `us.i.posthog.com`.
   - [ ] Confira se `posthog.__loaded` é `true`.

2. **Web Analytics**
   - [ ] Navegue entre rotas (ex.: `/`, `/auth/login`). Confirme os eventos `$pageview` na aba Network ou nos Live Events do PostHog.

3. **Identificação do usuário**
   - [ ] Faça login. Confirme que `posthog.identify()` é chamado (confira no debugger do PostHog ou na aba Network).
   - [ ] Faça logout. Confirme que `posthog.reset()` é chamado e que os eventos seguintes são anônimos.

4. **Session Replay — precisa continuar DESLIGADO (#864)**
   - [ ] Confirme que nenhuma requisição `/s/` (gravação de sessão) é enviada.
   - [ ] Confirme que nenhum replay aparece no PostHog para um nível jogado.

5. **Vínculo de sessão**
   - [ ] Faça uma chamada à API a partir do jogo (ex.: salvar progresso). Confirme que os headers `X-PostHog-Session-ID` e `X-PostHog-Distinct-ID` estão presentes na requisição.
   - [ ] No PostHog, encontre um evento do backend (ex.: `match_ended`) e confirme que ele tem o mesmo `session_id` dos eventos do frontend.

6. **Survey**
   - [ ] Conclua um nível e conquiste pelo menos uma estrela (com um usuário novo ou depois de limpar `hasEarnedStarBefore` do registry).
   - [ ] Confirme que o evento `first_star_earned` aparece nos Live Events do PostHog.
   - [ ] Confirme que o survey do PostHog é renderizado no ResultPanel ou na próxima tela de menu.

7. **Rastreamento de erros**
   - [ ] Provoque um erro no frontend (ex.: um throw num componente). Confirme que ele aparece no Error Tracking do PostHog.
   - [ ] Provoque um 500 no backend (se for seguro em dev). Confirme que ele aparece no Error Tracking do PostHog com stack trace.

---

## Plano de rollout

### Fase 1: Base (Semana 1)
1. Adicionar as env vars ao `.env.example`, ao schema do Zod do frontend e à config do backend.
2. Rodar `npx @posthog/wizard@latest` em `front/`.
3. Implementar o `PostHogProvider`, o `PostHogPageView` e os interceptors do Axios.
4. Implementar no backend o `PostHogModule`, o `PostHogService` e o `PostHogInterceptor`.
5. Smoke test básico: confirmar a inicialização e o rastreamento de `$pageview`.

### Fase 2: Eventos principais (Semana 2)
1. Adicionar `posthog.identify()` / `posthog.reset()` ao fluxo de auth.
2. Implementar as capturas de eventos do jogo no frontend (`game_started`, `level_completed`, `star_collected` etc.).
3. Implementar os eventos autoritativos do backend (`user_registered`, `user_logged_in`, `match_ended`).
4. Validar o vínculo de sessão: confirmar que os eventos do backend compartilham o `session_id` com o frontend.

### Fase 3: Surveys e feature flags (Semana 3)
1. ~~Ativar `record_canvas: true` e validar que o Session Replay mostra o canvas do Phaser.~~ Descartado pela #864.
2. Implementar a lógica do survey da primeira estrela no `ScoreManager` e no `ResultPanel`.
3. Configurar o survey na UI do PostHog com o gatilho `first_star_earned`.
4. ~~Criar a feature flag `session_replay_sampling_rate` na UI do PostHog.~~ Descartado pela #864.
5. Implementar o bootstrap no servidor para usuários autenticados.
6. Testar o timing e a UX do survey.

### Fase 4: Rastreamento de erros e acabamento (Semana 4)
1. Adicionar o `global-error.tsx` no frontend com `posthog.captureException()`.
2. Validar a captura de exceções do backend via interceptor.
3. Rodar `make lint` e `make test` completos.
4. Monitorar o volume de eventos do PostHog por 1 semana. Espere uma mudança brusca de volume por causa da #864: só jogadores que deram consentimento são contados.
5. Ajustar a feature flag `session_replay_sampling_rate` se necessário.

---

## Observações

- **Cobrança:** A gravação de canvas e o volume de eventos explícitos podem aumentar os custos rapidamente. Monitore o dashboard de uso do PostHog semanalmente após o lançamento. Com 5.000 usuários anuais esperados, o plano gratuito deve ser suficiente por um tempo.
- **Amostragem:** O padrão é 100% para todos os usuários (anônimos e autenticados) em Production. Se os custos dispararem, ajuste a feature flag `session_replay_sampling_rate` em vez de uma config fixa no código.
- **Privacidade:** Garanta que as configurações de privacidade do PostHog e quaisquer Termos de Uso / Política de Privacidade mencionem analytics e gravação de sessão. O PostHog oferece ferramentas para mascarar inputs sensíveis.
- **Analytics existente:** O pipeline customizado `sendGameEvent()` continua intocado. Nenhuma mudança no `AnalyticsService`, nas entities `GameEvent` ou nas tabelas existentes do banco.
- **Desenvolvimento:** O `PostHogStub` garante que os desenvolvedores possam trabalhar localmente sem chamadas de rede nem poluição de dados. Definir uma chave pessoal do PostHog no `.env.local` muda para o modo real para teste.
- **Staging:** Adiado até a infraestrutura de staging ser implantada. Quando estiver pronta, crie um projeto separado no PostHog e atualize as env vars em `compose.staging.yaml`.
- **Feature flags:** A flag `session_replay_sampling_rate` é avaliada apenas no carregamento da página. Mudanças no meio da sessão não afetam gravações em andamento.
