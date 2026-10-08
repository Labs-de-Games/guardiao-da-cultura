🌐 [English](../en/VERSIONING.md) | Português (Brasil)

# **Diretrizes e estrutura do processo de release — Guardião da Cultura**

Este documento estabelece o padrão oficial para gerenciar, planejar e executar os releases do Guardião da Cultura, garantindo a estabilidade do ambiente de produção e a previsibilidade das entregas.

## **1. Janelas de release (dias e horários)**

Para reduzir riscos e garantir a disponibilidade do time de suporte, os releases em produção devem seguir estritamente o calendário abaixo:

| Tipo de release | Dias permitidos | Horário limite | Impacto esperado |
| :---- | :---- | :---- | :---- |
| **Release ordinário (Minor/Patch)** | Segunda-feira | 13h–15h | Baixo / Transparente |
|  | Terça-feira | 13h–19h |  |
|  | Quinta-feira | 13h–19h |  |
| **Nova versão (Major)** | Quinta-feira | 13h–15h | Médio a alto (indisponibilidade programada) |
| **Emergência (Hotfix)** | Qualquer dia (sujeito a aprovação) | Imediatamente após a validação, evitando o fim do dia | Crítico (correção de bug bloqueante) |

*Observação: deploys ordinários são estritamente proibidos às sextas-feiras, em vésperas de feriado ou em períodos de grande engajamento do público, como datas de divulgação pública.*

## **2. Nomenclatura e versionamento**

Adotamos o padrão **Semantic Versioning (SemVer)** no formato *MAJOR.MINOR.PATCH*:

* **MAJOR:** incrementado quando há mudanças incompatíveis com versões anteriores (breaking changes).
* **MINOR:** incrementado quando novas funcionalidades são adicionadas de forma compatível com versões anteriores.
* **PATCH:** incrementado quando são aplicadas correções de bugs compatíveis com versões anteriores.

### **Nomenclatura de branches e tags do Git**

A estrutura de branches do código deve seguir o fluxo abaixo:

* **master:** sempre reflete o código que está em produção
* **develop:** a versão mais atualizada e completa do código, ainda em validação
* **release/vX.Y.Z:** branch de preparação de um release, criada a partir da `develop`
* **hotfix/vX.Y.Z:** branch para correções urgentes em produção

**Tags:** todo release bem-sucedido deve gerar uma tag semântica imutável (por exemplo, v1.4.2).

## **3. Ambientes de staging e produção**

Exemplo de produção: v1.0.0 -> Versão 1.0.0 com as seguintes funcionalidades:

* Descrição completa das mudanças incluídas na versão.

O staging não é versionado com tags: todo push na `develop` é publicado em staging pelo `cd-staging.yml`.

### **Histórico de versões e deploys**

Veja [docs/CHANGELOG.md](../CHANGELOG.md) para o changelog completo por versão. Quem mantém o projeto faz o deploy em produção pelo workflow de CD de produção (`cd-production.yml`), então cada deploy em produção é uma execução desse workflow na aba Actions do repositório.

## **4. Processo de execução passo a passo**

O processo é dividido em três etapas obrigatórias:

1. **Pré-release:**
   * Garantir que todos os testes e mudanças foram aprovados no pipeline de CI.
   * Gerar o Changelog com a lista de funcionalidades e correções incluídas.
   * Congelar novas mudanças (Code Freeze) na branch de release.
2. **Execução (Deploy):**
   * Fazer um backup preventivo do banco de dados e do estado da aplicação.
   * Disparar o pipeline de CD para o ambiente de produção.
   * Monitorar os logs em tempo real durante a virada.
3. **Pós-release (Sanity Check):**
   * Rodar testes nas principais mecânicas do jogo e jornadas do usuário.
   * Validar as métricas de performance e de infraestrutura (CPU, memória, erros).

## **5. Plano de rollback (reversão de versão)**

Se um release apresentar instabilidade insustentável durante a etapa de Pós-release, os critérios de ativação e as etapas de rollback a seguir devem ser acionados imediatamente:

### **Critérios de ativação**

* Indisponibilidade total do sistema sem diagnóstico rápido.
* Falha crítica em um fluxo importante ou em uma função central do negócio.
* Taxa de erro acima de 5% nas requisições globais após o deploy.

### **Procedimento de rollback**

1. **Passo 1:** voltar a produção para a versão estável anterior. O `cd-production.yml` não recebe parâmetros: ele gera o build do commit atual da `master`, publica as imagens como `master-<short-sha>` e `master` e dispara o deploy em produção. Para fazer o rollback, reverta a mudança com defeito na `master` por meio de um pull request `hotfix/vX.Y.Z` e rode o `cd-production.yml` de novo. As imagens dos builds de produção anteriores continuam no registro de containers como `master-<short-sha>`; a tag do release anterior identifica o commit, e portanto a imagem, para onde voltar.
2. **Passo 2:** se houve mudança no schema do banco de dados (migrations), aplicar o script de reversão correspondente, garantindo a integridade dos dados inseridos durante o intervalo.
3. **Passo 3:** notificar o time e os stakeholders sobre o retorno à versão anterior.
4. **Passo 4:** abrir uma sessão de Post-Mortem em até 24 horas para analisar a causa raiz da falha.
