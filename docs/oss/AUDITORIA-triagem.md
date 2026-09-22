# Triagem de `AUDITORIA-ESPECIALISTA-OPEN-SOURCE.md`

Documento de resposta técnica à auditoria enviada pelo tech lead sobre o Epic #796 (abertura pública de "Guardião da Cultura"). Cada item da auditoria foi verificado contra o código real do repositório e recebeu um veredito, com evidência em `arquivo:linha`.

Este documento **não altera** `docs/oss/PLAN-open-source.md`. As mudanças de escopo propostas na seção 7 ficam para decisão do tech lead e da PO.

---

## 1. Veredito geral

A auditoria é um documento misto. Ela contribui um punhado de achados genuínos e até então não registrados — sendo o melhor deles uma condição de corrida real no consumo do token de magic link. Mas a maior parte do seu volume recomenda coisas que o código já implementa, em alguns casos com qualidade superior à do próprio exemplo de código anexado. Dois itens contradizem frontalmente decisões já travadas com a PO, e vários trechos de código causariam regressão se aplicados literalmente.

A premissa de abertura — de que o plano existente é "insuficiente para mitigar riscos de nível militar" — não se sustenta na verificação: o plano já cobre rotação de credenciais, scan de segredos, guarda de workflows de deploy contra forks e remoção do workflow agêntico antes do flip.

| Categoria | Itens |
|---|---|
| Aceitos — novos e válidos | 11 |
| Já implementados no código | 7 |
| Conflitam com decisão travada | 2 |
| Incorretos ou perigosos como escritos | 7 |

O valor prático da auditoria concentra-se em três frentes: o TOCTOU do magic link, o endurecimento dos workflows do GitHub Actions, e a exposição LGPD do cadastro — esta última acertada pelo motivo errado, já que a solução que a auditoria propõe já existe enquanto o problema verdadeiro passou despercebido.

---

## 2. Achados aceitos

### 2.1 TOCTOU no consumo do token de magic link

`back/src/modules/auth/services/magic-link.service.ts:82-92`

`validateTokenConsumption` delega a verificação a `validateTokenPreview` (`:83`), que faz um `findOne` (`:53`) e checa `token.usedAt` em memória (`:58-64`). Só depois, de volta no chamador, o campo é marcado e gravado (`:86-87`). Não há transação, `SELECT ... FOR UPDATE`, `DELETE ... RETURNING` nem `UPDATE ... WHERE usedAt IS NULL`. Duas requisições concorrentes com o mesmo token passam ambas pela checagem antes de qualquer uma escrever.

Agravantes registrados no mesmo caminho: a comparação de nonce acontece depois do token já ter sido marcado como usado (`back/src/modules/auth/services/auth.service.ts:195-207`), então uma tentativa com nonce divergente queima o token; e `revokeToken` (`:94-101`) usa `update()` condicional, mostrando que o padrão atômico já é conhecido no arquivo, apenas não foi aplicado no consumo.

Destino proposto: T2, como defeito próprio.

### 2.2 `POST /auth/login/confirm` sem throttle

`back/src/modules/auth/controllers/auth.controller.ts:103-118`

`login` (`:86`), `register` (`:67`) e `resend-verification` (`:219`) carregam `@ThrottleByEmail`. O endpoint que efetivamente consome o token não tem limite algum. Combinado com a ausência de índice e de `unique` na coluna `token` (`back/src/modules/auth/entities/magic-link-token.entity.ts:16-17`), cada tentativa de adivinhação é um seq scan sem teto de frequência.

Destino proposto: T2.

### 2.3 `ThrottlerGuard` configurado mas nunca registrado

`back/src/app.module.ts:41-48` configura `ThrottlerModule.forRoot` com 100 req/min. `:51-54` registra como `APP_GUARD` apenas `GlobalJwtGuardProvider` e `RolesGuard`. Sem `ThrottlerGuard` global, `@Throttle()` puro é inerte — o que torna inúteis as anotações em `auth.controller.ts:161` e `back/src/modules/admin/controllers/admin.controller.ts:23`. O rate limit só funciona onde `@ThrottleByEmail` anexa o guard explicitamente.

Destino proposto: T2.

### 2.4 Workflows sem bloco `permissions:`

`.github/workflows/ci.yml` não tem bloco algum, nem no topo nem por job — herda o padrão do repositório. Nos workflows de deploy, o job `build-and-push` declara permissões (`cd-staging.yml:17-19`, `cd-production.yml:14-16`), mas o job `deploy`, que é justamente o que carrega `COOLIFY_TOKEN`, não declara (`cd-staging.yml:68-71`, `cd-production.yml:64-67`).

Vale por princípio de menor privilégio, não por caminho de exploração aberto — ver 5.5.

Destino proposto: T2.

### 2.5 Actions presas a tags flutuantes

Os três workflows escritos à mão usam tags móveis: `ci.yml:13,16`; `cd-production.yml:23,32,39,42,55`; `cd-staging.yml:26,36,43,46,59` (`actions/checkout@v4`, `actions/setup-node@v4`, `docker/login-action@v3`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v5`). Só o lock gerado pelo gh-aw fixa por SHA (`daily-team-status.lock.yml:104,132,146,315,412,431`) — e esse arquivo sai do repositório no flip.

Destino proposto: T2, prioridade média.

### 2.6 Segredos de deploy em Secrets globais do repositório

`cd-production.yml:70-71` e `cd-staging.yml:74-75` leem `COOLIFY_WEBHOOK_URL_*` e `COOLIFY_TOKEN` do escopo do repositório. Movê-los para GitHub Environments com regra de aprovação e restrição de branch é ganho real, e barato.

Ressalva de precisão: a auditoria fala em restringir à branch `main`. As branches deste repositório são `master` e `develop`.

Destino proposto: T2.

### 2.7 Rota TTS sem timeout, sem try/catch e com `voice` irrestrito

`front/src/app/api/tts/synthesize/route.ts`

- `:48` — `const upstream = await fetch(url);` sem `AbortSignal`, sem timeout, sem retry.
- `:48` e `:58` — nenhum try/catch em volta do `fetch` nem do `arrayBuffer()`. Um erro de rede, ou o `ZodError` do acesso a `serverEnv.server` em `:40`, escapa do handler e vira o 500 padrão do Next.
- `:15-20` mapeia quatro vozes conhecidas, mas `:35` cai em `?? body.voice ?? "pt-BR"`, então qualquer string do cliente chega ao parâmetro `tl=` do upstream. Não é SSRF — o host é fixo — mas é passthrough sem validação, e o schema declara `voice` como `z.string().optional()` sem enum.
- A rota é pública, sem autenticação e sem rate limit.

Destino proposto: T3.

### 2.8 Postgres de desenvolvimento publicado no host

`compose.development.yaml:127-128` publica `${POSTGRES_PORT:-5432}:5432` com `POSTGRES_PASSWORD:-postgres` (`:125`). Alcançável da rede local com credencial trivial.

Correção de escopo em relação à auditoria: produção e staging **não** publicam a porta (`compose.production.yaml:175-198`, `compose.staging.yaml:175-198`) — ver 4.6.

Destino proposto: T2, severidade baixa.

### 2.9 Nenhum secret scanning existe hoje

Não há `.gitleaks.toml`, `.secrets.baseline`, `.pre-commit-config.yaml` nem step de scan no CI. Os hooks husky rodam typecheck, lint e testes apenas (`.husky/pre-commit`, `.husky/pre-push`, `.husky/commit-msg`), e `ci.yml:24-34` não inclui scan. O plano já prevê o scan pontual em T2; vale transformá-lo em gate permanente antes de aceitar PRs de fork.

Destino proposto: T2.

### 2.10 CSP presente porém comentado

`nginx/nginx.production.conf.template:24` e `nginx/nginx.staging.conf.template:24` carregam a diretiva `Content-Security-Policy` comentada. Os demais headers já estão ativos (`:17-21`). Falta também `Strict-Transport-Security`.

Destino proposto: T2. Ver 5.3 quanto ao conteúdo proposto pela auditoria.

### 2.11 LGPD — a lacuna real

A auditoria acerta que existe exposição LGPD, mas erra o diagnóstico: propõe um modo visitante que já existe (ver 4.4). O problema verdadeiro está no cadastro.

- `back/src/modules/users/user.entity.ts:15-28` — coleta `email`, `nickname`, `firstName`, `lastName` e `dateOfBirth`.
- `back/src/common/validators/is-valid-date.decorator.ts:15-19` — o validador de `dateOfBirth` só checa se a data é parseável. Qualquer data passa, inclusive futura. **Não há age gate.**
- `front/src/lib/auth/validation.ts:7-21` — `registerSchema` não tem campo de aceite de termos nem de consentimento.
- Não existe página de política de privacidade, termos de uso, banner de cookies, nem endpoint de exclusão ou exportação de dados.
- `docs/ARCHITECTURE.md:50` afirma `Minimal personal data collection, strict LGPD compliance` — afirmação que o código não sustenta e que fica pública no flip.

Ou seja: um jogo educativo, dirigido a estudantes, coleta nome completo, email e data de nascimento sem consentimento destacado e sem verificação de idade, e envia eventos comportamentais ao PostHog com `distinctId` do usuário (`back/src/modules/auth/services/auth.service.ts:142-148,216-222,253-259`).

Destino proposto: T4 para a correção da afirmação em `ARCHITECTURE.md` e para os documentos de privacidade; defeito próprio para o age gate e o consentimento.

---

## 3. Já implementado — a auditoria pede o que existe

| Recomendação | O que o código já faz |
|---|---|
| §4.1.1 — criar `front/src/lib/tts/BrowserTTSFallback.ts` | Já existe, e melhor. `front/src/lib/audio/AudioAccessibilityService.ts:82-106` implementa `speakNative`: guarda `window.speechSynthesis` (`:84`), chama `cancel()` antes de falar (`:88`), define `lang = "pt-BR"` (`:90`), sincroniza volume (`:91`), e — o que o exemplo da auditoria não faz — aplica ducking do áudio do jogo (`:92-97`) e deduplica falas concorrentes por `requestId` (`:112,123`). Já está acionado em `:154` (erro do elemento de áudio) e `:160-164` (catch da cadeia de fetch). Substituir pelo exemplo da auditoria seria regressão. |
| §4.2.1 — token nunca em texto claro, `randomBytes(32)` + SHA-256 | Já é `randomBytes(64).toString("base64url")` + SHA-256 (`back/src/modules/auth/services/magic-link.service.ts:17-23`), gravado já hasheado (`:31-43`). Entropia maior que a pedida. |
| §4.2.2 — TTL máximo de 15 minutos | Já são 15 minutos (`magic-link.service.ts:29,33`), configuráveis por `MAGIC_LINK_EXPIRATION_MIN` (`back/src/core/config/config.service.ts:15`). Nota menor: o caminho de verificação de email não passa o valor de config e usa o default do parâmetro (`auth.service.ts:134-137`). |
| §6.2 — implementar "Modo Visitante / Offline" com progresso em localStorage | Já existe como caminho de primeira classe. `front/src/components/auth/PlayerGuard.tsx:18-37`; sessão anônima em `front/src/lib/guestSession.ts:36-50`; persistência de pontuação e eventos em `front/src/lib/persistence/gamePersistence.ts:81,91,109`; badges em `front/src/game/systems/BadgeSystem.ts:108`; e onze endpoints marcados `@GuestPlay()` no backend. Ver 6.1 para o defeito real deste caminho. |
| §4.1 — limitar tamanho do texto no TTS | `front/src/app/api/tts/synthesize/route.ts:5-13` já valida `z.string().min(1).max(5000)`. Ver 5.1 quanto ao valor proposto. |
| §5.2 — Postgres não deve expor 5432 | Produção e staging já não expõem (`compose.production.yaml:175-198`, `compose.staging.yaml:175-198`). Nenhum compose usa `expose:`; o serviço só é alcançável pela rede interna do Docker. Resta o caso de desenvolvimento — ver 2.8. |
| §4.3 — esperar o Postgres antes de migrar | Healthcheck `pg_isready` e `depends_on: condition: service_healthy` já existem nos três compose files (`compose.development.yaml:131-135` e `:115-117`; mesmo padrão em prod e staging). O `db-wait` proposto seria redundante. A lacuna verdadeira é de encadeamento, não de corrida: `db-migrate` (`Makefile:160-162`) não depende de `development-up` (`:61-62`), e `setup` (`:31-34`) não encadeia em nenhum dos dois — apenas imprime os próximos passos. Melhoria de usabilidade para cold start, relevante para T3. |
| §4.4 — headers de segurança HTTP | `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` e `Permissions-Policy` já estão ativos no nginx de produção e staging (`nginx/nginx.production.conf.template:17-21`). `front/next.config.ts` não define headers — a decisão a tomar é escolher **uma** camada, nginx ou Next, não duplicar as duas. O nginx de desenvolvimento não tem headers (`nginx/nginx.development.conf.template`). |

---

## 4. Conflitos com decisões travadas

Estes dois itens não são questão técnica; são reversão de decisão. Não devem ser aplicados sem a PO.

### 4.1 Cláusula proibitiva no `ASSETS-LICENSE.md` (§6.1)

A auditoria redige: *"É expressamente PROIBIDA a extração, reprodução descontextualizada, comercialização, estampagem ou reutilização comercial de qualquer imagem aqui presente."*

A decisão travada é oposta em natureza. As obras foram liberadas pela PO e a condição vinculante é **crédito sempre**, não proibição de uso (`docs/oss/PLAN-open-source.md:16,31-37,63`). O plano converte deliberadamente o problema de *direitos* em problema de *durabilidade da atribuição*.

Além do conflito, a redação proibitiva inviabiliza o próprio objetivo do Epic #796: um projeto aberto para que educadores adaptem e reutilizem. Uma licença que proíbe reutilização descontextualizada das obras torna a adaptação pedagógica juridicamente ambígua.

A auditoria também afirma fatos jurídicos que não são verificáveis a partir do repositório — gestão de direitos pelo IPEAFRO, representação por agentes específicos. Isso exige confirmação documental antes de virar texto de licença publicado.

**Encaminhamento:** o plano mantém a redação com atribuição obrigatória. O alcance da liberação e a redação final do `ASSETS-LICENSE.md` são decisão da PO ([@anacarla-42](https://github.com/anacarla-42)).

### 4.2 Expurgo de `docs/handoff` de todo o histórico (§3.2, §8)

O script de sanitização executa `git filter-repo --path docs/handoff --invert-paths`. Isso contradiz duas decisões travadas: preservar o histórico completo (`docs/oss/PLAN-open-source.md:14,111`) e manter os documentos de engenharia após redigir o hostname do Coolify (`:118-122`).

O custo concreto da reescrita: invalida todo SHA de commit citado em PRs e issues, quebra clones e forks existentes, e ainda assim não recupera o que o GitHub mantém referenciável por hash em PRs fechados — limitação que a própria auditoria descreve em §3.1 e depois ignora ao propor a solução.

O plano já aceita explicitamente a consequência de os documentos continuarem legíveis em commits antigos, e já define quando a reescrita se justifica: apenas se o scan de segredos encontrar credencial viva, e nesse caso ainda enquanto o repositório é privado (T2 passo 2, T5 passo 2).

**Encaminhamento:** manter a decisão do plano. Registrar que o script não deve ser executado como está.

---

## 5. Incorreto ou perigoso se aplicado literalmente

### 5.1 Limite de 250 caracteres no TTS (§4.1)

O limite atual é 5000 (`front/src/app/api/tts/synthesize/route.ts:5-13`). Baixar para 250 trunca a narração de diálogos e de descrições de obras — que é exatamente a função de acessibilidade da rota. O problema real de DoS é a ausência de rate limit e de timeout (2.7), não o tamanho do texto.

### 5.2 Regex `^[\p{L}\p{N}\p{P}\p{Zs}]+$` (§4.1)

Rejeita quebra de linha e qualquer símbolo fora de `\p{P}`, então texto de narração legítimo passa a responder 400. Pior: o exemplo de schema descarta `voice`, `rate` e `pitch`, que o cliente envia hoje (`front/src/lib/audio/AudioAccessibilityService.ts:117-122`) — a seleção de voz quebraria.

### 5.3 CSP proposto (§4.4)

`connect-src 'self' https://*.posthog.com` omite `NEXT_PUBLIC_API_URL`. Se o backend estiver em host distinto do frontend — que é o caso do deploy via Coolify — todas as chamadas de API são bloqueadas em produção. A diretiva `script-src` com `'unsafe-eval' 'unsafe-inline'` também esvazia boa parte da proteção pretendida.

### 5.4 Flag `NEXT_PUBLIC_SHOW_INSTITUTIONAL_BRANDING` (§6.3)

Não existe nenhum arquivo de logo institucional no repositório: `front/public/images/` contém um único SVG (`etiqueta/icon-text-to-speech.svg`). As marcas são cinco entradas de texto numa seção de `front/src/ui/credits/creditsData.ts:17-27`, com um único ponto de renderização (`CreditsScreen.tsx:19` → `GameOverlay.tsx:346`). Uma variável de ambiente, um campo no schema e uma condicional de render é mais máquina do que o problema comporta; a cláusula no `NOTICE` que o plano já decidiu (`docs/oss/PLAN-open-source.md:70`) cobre o caso.

Além disso, o código proposto tem bug: `z.coerce.boolean()` aplicado à string `"false"` retorna `true`, porque `Boolean("false") === true`. O default proposto faria o contrário do que o texto afirma.

### 5.5 PPE tratado como risco alto (§5.1)

Nenhum workflow usa `pull_request_target`. `ci.yml` é o único com gatilho `pull_request` (`:4-5`) e não referencia segredo algum. `cd-staging.yml` dispara em `push` para `develop` (`:4-6`) e `cd-production.yml` só em `workflow_dispatch` (`:4`) — nenhum alcançável por PR de fork. O endurecimento de 2.4 e 2.5 continua valendo por menor privilégio, mas não existe hoje o caminho de exploração que a seção descreve.

Registro adicional: o plano já prevê a guarda `if: github.repository == 'Labs-de-Games/gameplate'` nos workflows de deploy (`docs/oss/PLAN-open-source.md:129`) — item que a auditoria não menciona. Nenhuma guarda desse tipo existe no repositório hoje.

### 5.6 Script forense (§3.2)

Além do conflito de decisão (4.2), o script executa `git filter-repo` incondicionalmente, antes de saber se o scan achou alguma coisa — a ordem correta é scan, depois decisão, depois rotação, depois eventual reescrita. As flags do TruffleHog também precisam de conferência: `--entropy=true` não é flag da v3.

### 5.7 Restrição à branch `main` (§5.1.3)

As branches deste repositório são `master` e `develop`. Não existe `main`.

---

## 6. Lacunas dos dois documentos

Riscos reais que nem a auditoria nem o plano registram.

### 6.1 Assimetria da flag `guest_play_enabled`

O frontend falha **aberto**: após 5 s de timeout da flag, `guestPlayEnabled` vira `true` (`front/src/components/auth/PlayerGuard.tsx:10,30-32`). O backend falha **fechado**: sem cliente PostHog ou com erro na flag, retorna `false` (`back/src/modules/posthog/posthog.service.ts:39-45,55-60`). Se o PostHog ficar indisponível em produção, o jogador entra no jogo e toda chamada de API responde 401. Em desenvolvimento a flag é incondicionalmente `true` (`:30-33`), então o cenário não aparece localmente.

Não há `middleware.ts` no frontend — `PlayerGuard` é redirect client-side em `useEffect`, sem proteção server-side de rota.

### 6.2 Tokens expirados não são coletados

`cleanupExpired()` (`back/src/modules/auth/services/magic-link.service.ts:105-112`) só é chamado oportunisticamente a partir de `resendVerificationEmail` (`back/src/modules/auth/services/auth.service.ts:303`). Não há `@Cron` nem `ScheduleModule` no projeto. Linhas expiradas acumulam indefinidamente numa tabela sem índice.

### 6.3 Colunas de dado pessoal declaradas e nunca gravadas

`ipAddress` e `userAgent` existem no schema de `magic_link_token` (`back/src/modules/auth/entities/magic-link-token.entity.ts:40-44`) e de `refresh_token` (migração `1778520132998`), mas `createMagicLink` (`magic-link.service.ts:35-41`) nunca as popula. Schema de dado pessoal sem uso — relevante para a revisão LGPD de 2.11: ou se remove, ou se documenta a finalidade.

### 6.4 Capturas de tela do board privado

`docs/handoff/assets/img/` contém 10 JPGs (88K–226K cada) que são capturas da interface do GitHub: board Kanban, execuções do Actions, issues e PRs internos. Nenhum dos dois documentos menciona esse diretório. Ele vai a público junto com os documentos de handoff e pode conter nomes, avatares e títulos de issues internas — precisa ser revisado item a item na decisão de T2 sobre o que fica no tree público.

---

## 7. Encaminhamento

**T2 — `chore/oss-repo-prep`**
Blocos `permissions:` nos workflows (2.4); GitHub Environments para segredos de deploy (2.6); pinning por SHA (2.5); `ThrottlerGuard` global (2.3); throttle em `login/confirm` e índice único em `token` (2.2); TOCTOU do consumo de token (2.1); CSP e HSTS no nginx (2.10, com a ressalva de 5.3); bind do Postgres de desenvolvimento (2.8); secret scanning como gate permanente (2.9); revisão de `docs/handoff/assets/img/` (6.4).

**T3 — `fix/oss-local-run`**
Timeout e try/catch na rota TTS, enum de `voice` (2.7); chave ResponsiveVoice opcional, com resposta documentada em vez de 500 — observando que o fallback de cliente **já existe e já dispara** (3, linha 1), de modo que o ganho é eliminar o round trip desperdiçado por fala e a dependência de uma chave paga e NonCommercial, não criar o fallback; encadeamento dos alvos do Makefile (3, última linha).

**T4 — `docs/oss-documentation`**
Corrigir a afirmação de conformidade LGPD em `docs/ARCHITECTURE.md:50`; política de privacidade, termos de uso e consentimento; age gate no cadastro (2.11).

**Para a PO ([@anacarla-42](https://github.com/anacarla-42))**
Alcance da liberação das obras e redação final do `ASSETS-LICENSE.md` (4.1).

**Para operação, fora do escopo do repositório**
Painel Coolify atrás de VPN ou Cloudflare Zero Trust (§7.1 da auditoria — recomendação válida, mas não é mudança de repositório); rotação preventiva de credenciais, já prevista no plano em T2 passo 2 e T5 passo 2.

**Não aplicar**
Script de sanitização com expurgo de `docs/handoff` (4.2); cláusula proibitiva nas obras sem decisão da PO (4.1); limite de 250 caracteres e regex de sanitização no TTS (5.1, 5.2); flag de branding institucional (5.4); substituição do fallback de TTS existente (3, linha 1).
