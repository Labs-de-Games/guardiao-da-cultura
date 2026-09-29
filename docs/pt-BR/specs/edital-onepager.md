# Onepager — Requisitos mínimos do Dashboard Institucional (edital)

**Status: provisório.** O documento real do onepager não foi encontrado no repositório
(`grep -ril onepager` não retorna nada) e não estava disponível de outra forma quando este arquivo
foi commitado. Este arquivo existe para que a definição do funil — o artefato que um auditor avalia —
fique versionada junto ao código que a calcula, em vez de viver só num histórico de chat.

**Ação necessária:** substituir a lista provisória do funil abaixo pelo texto real do onepager de
origem assim que ele estiver disponível, e remover esta nota de status.

## Etapas do funil (provisório — PRESSUPOSTO, ainda não confirmado)

Derivado da própria lista ordenada de critérios de aceite da issue #741, internamente consistente com #741 e #742.
**Precisa ser confirmado na #739 antes de a Q4 da #742 ser congelada.**

1. `landing_page_viewed`
2. `play_clicked`
3. `gameplay_started`
4. `chapter_1_started`
5. `quiz_started`
6. `quiz_completed`
7. `chapter_1_completed`

> **Substituído (issue #807):** o funil entregue não usa exatamente esta
> lista. `chapter_1_started`/`chapter_1_completed` só cobriam o
> nível 1, então a #807 substituiu as etapas 4–7 por uma etapa dinâmica
> `level_completed` por nível (#834: os 3 níveis do `LEVEL_REGISTRY` mais a
> investigação, nível 4, via `DASHBOARD_LEVELS` — ou seja, 7 etapas no total hoje,
> sendo a última `investigation_completed`, que também é o que "concluiu o
> jogo" significa na taxa de conclusão). Veja a seção "Funil canônico do edital" do `EVENTS.md` e
> o `getFunnelSteps()` de `front/src/lib/edital/server/queries.ts` para a
> lista real e atual. Esta seção é mantida como está abaixo porque é o
> pressuposto histórico do qual este épico partiu, não uma descrição do
> que foi entregue.

## 8 cards, em ordem

Não é derivável a partir de evidências do repositório — a lista exata de cards e a ordem do onepager
são a maior lacuna de evidência apontada no documento de discovery (§1). **Bloqueado** até o documento
de origem ser fornecido. Não chute uma lista de cards aqui; a #745 não pode ser marcada como concluída
de forma objetiva sem ela.

## `EDITAL_PERIOD_START`

**Mecanismo entregue (etapa 5); a data real ainda não foi registrada.** `front/src/lib/edital/server/period.ts`
lê `EDITAL_PERIOD_START` do ambiente (`front/src/lib/env-server.ts`) como uma string de data ISO
(ex.: `2026-04-01`) e limita todo intervalo de datas — o `from` de `today`/`7d`/`30d`/`custom` e o
limite inferior de `all-time` — para nunca resolver antes dela. Isso é propositalmente **config, não
uma constante no código**: o valor só pode ser conhecido honestamente depois que a issue #740 (base de
identidade) tiver de fato ido para produção, já que todo evento anterior a essa data é inutilizável
para análise (ids anônimos rotativos, sem atribuição, sem etapa 1 confiável).

**Até essa data de deploy ser registrada, a variável fica sem valor, o que significa:**
- Os intervalos `today`/`7d`/`30d`/`custom` não são limitados (nenhum limite inferior é aplicado).
- `all-time` cai de volta para a época Unix (`new Date(0)`) — exatamente o risco de "full scan" que
  esta constante existe para evitar. **Esta é uma lacuna conhecida e ativa, não hipotética:** enquanto
  `EDITAL_PERIOD_START` estiver sem valor no ambiente em produção, uma requisição `all-time` não tem
  nenhum limite inferior do lado do ClickHouse.

**Ação necessária antes do lançamento em produção:** assim que a #740 for entregue, registrar a data
real do deploy dela como `EDITAL_PERIOD_START` no runtime do Coolify/`.env`, tanto em staging quanto
em produção, e atualizar esta seção com essa data e a justificativa (ex.: "definido como 2026-XX-XX,
data de deploy da #740, conforme log de deploy / tag de release"). Não chute nem retroceda esse valor —
um "ainda não definido" honesto é mais seguro do que uma constante errada que delimita silenciosamente
de forma incorreta toda query all-time, sem nenhum sinal de que algo está errado.

## Modelo de atribuição

**Propriedade de evento, não propriedade de pessoa.** `person_profiles` está configurado como
`identified_only` (fato verificado, discovery §3.1), o que descarta propriedades de pessoa para
jogadores anônimos. Todo evento canônico precisa, portanto, carregar `campaign_source` (e os campos de
atribuição relacionados) diretamente na linha do evento. Essa decisão fica travada na entrada da
#741/#742 para que os quatro query builders não sejam reescritos depois.

---

## Spike #739 — questões técnicas

### (a) `windowFunnel` está disponível em HogQL neste projeto?

**Bloqueado — não é verificável a partir deste ambiente.** Responder exige rodar uma query no
projeto real do PostHog (chave pessoal `phx_`, conta ativa). Não havia acesso a nenhuma conta do
PostHog durante esta rodada. Ação: rodar manualmente a query do discovery §6 ("Useful experiments")
no editor SQL do PostHog e colar o resultado aqui, antes de a Q4 da #742 ser escrita em cima de um
pressuposto real.

Fallback caso não esteja disponível, registrado para referência: `uniqExactIf` + um clamp — prova
"etapas alcançadas", não "em ordem"; mudaria o texto da tela 2 da #745 de acordo.

### (b) Quais são os rate limits da Query API no plano atual?

**Bloqueado — não é verificável a partir deste ambiente.** Exige o probe com `curl` da #743 (etapa 1
do plano de implementação) contra a conta ativa do PostHog com a chave `phx_`. Ação: capturar os
headers/limites da resposta desse probe e registrá-los aqui.

### (c) O NextAuth v5 roda no Next 16.2.9?

**Parcialmente respondido — compatibilidade no nível de pacote confirmada, teste real em
Edge/middleware ainda pendente.**

- Versão do Next.js fixada no repositório, verificada em `package-lock.json:8857`: **16.2.9** (bate
  com a instrução do discovery §6 "front/package.json for the resolved Next version").
- `next-auth@5.0.0-beta.32` (registry do npm, último beta v5 no momento da verificação) declara
  `peerDependencies.next: "^14.0.0-0 || ^15.0.0 || ^16.0.0"` — o Next 16 está dentro da faixa de
  suporte declarada. Isso é evidência real de que o pacote **afirma** ser compatível; não é prova de
  que `auth()` funciona dentro de um bundle de middleware Edge nessa versão exata, que é o que o
  discovery corretamente aponta como aquilo que de fato precisa ser testado.
- **Ainda necessário antes de considerar (c) totalmente respondida:** subir uma rota descartável de
  NextAuth v5 numa branch deste repo (ou uma reprodução mínima com Next 16.2.9) e confirmar que
  `auth()` resolve dentro de `middleware.ts` com uma config separada compatível com Edge
  (`auth.config.ts` vs `auth.ts`, conforme discovery §5.5). Não feito nesta rodada — ainda não existe
  dependência de NextAuth no repo (`package-lock.json` confirma 0 ocorrências de
  `next-auth`/`@auth/core`), então isso é trabalho novo, não uma checagem de regressão.
- **Fallback em avaliação caso o teste de Edge/middleware falhe:** manter o serviço de magic link
  existente atrás de um provider `Credentials` em vez de adicionar NextAuth v5 + OAuth — reaproveita
  um serviço que já usa tokens de 64 bytes e SHA-256 em repouso, não adiciona superfície de OAuth e
  tornaria a #747 praticamente redundante (discovery §6).

### (d) O que é `EDITAL_PERIOD_START`?

Veja a seção dedicada acima — o mecanismo (clamp guiado por env em `period.ts`) foi entregue na
etapa 5 do plano de implementação. O valor real da data ainda não foi registrado: ele é circular com a
#740 e só pode ser definido quando a data de deploy da #740 for conhecida.

---

## Próximos passos para encerrar este arquivo

1. Obter o texto real do onepager e substituir a lista provisória do funil e a lista de 8 cards que falta.
2. Rodar a query de `windowFunnel` e o probe de rate limit contra a conta ativa do PostHog; colar os
   resultados em (a) e (b) acima.
3. Subir o smoke test descartável de middleware com NextAuth v5 + Next 16.2.9; registrar o veredito em
   (c) acima.
4. Quando os quatro estiverem resolvidos, remover a nota de status "provisório" deste arquivo.
