# **Diretrizes e Estrutura do Processo de *Release* do *Game* Rouanet**

Este documento estabelece o padrão oficial para o gerenciamento, planejamento e execução de *releases* do *Game* Rouanet, garantindo a estabilidade do ambiente de produção e a previsibilidade das entregas.

## **1\. Janelas de *Release* (Dias e Horários)**

Para mitigar riscos e garantir a disponibilidade da equipe de suporte, *as releases* em produção devem seguir estritamente o cronograma abaixo:

| Tipo de *Release* | Dias Permitidos | Horário Limite | Impacto Esperado   |
| :---- | :---- | :---- | :---- |
| ***Release*** **Ordinária (*Minor/Patch*)** | Segunda-feira | 13h às 15h | Baixo / Transparente |
|  | Terça-feira | 13h às 19h |  |
|  | Quinta-feira | 13h às 19h |  |
| **Nova Versão (*Major*)** | Quinta-feira | 13h às 15h | Médio a Alto (Indisponibilidade programada) |
| **Emergencial (*Hotfix*)** | Qualquer dia (Sujeito a aprovação) | Imediato após validação, evitar fim do dia | Crítico (Correção de *bug* bloqueante) |

*Nota: É estritamente proibida a realização de deploys ordinários em sextas-feiras, vésperas de feriados ou períodos de alta carga comercial, como datas de divulgação ao público.*

Maiores detalhes sobre a janela de uso do game, verificar o [Plano de Release Técnica](https://docs.google.com/document/d/1-QBGFMwnMgHSds0LesnqVGQxeC38-H3ouVTGK2lNV1M/edit?usp=sharing).

## **2\. Nomenclatura e Versionamento**

Adotamos o padrão ***Semantic Versioning*** **(SemVer)** no formato *MAJOR.MINOR.PATCH*:

* ***MAJOR*****:** Incrementado quando há mudanças incompatíveis com versões anteriores (*breaking changes*).  
* ***MINOR*****:** Incrementado quando novas funcionalidades são adicionadas de maneira retrocompatível.  
* ***PATCH*****:** Incrementado quando correções de *bugs* retrocompatíveis são aplicadas.

### **Nomenclatura de *Branches* e *Tags Git***

A estrutura de ramificação do código deve seguir o fluxo abaixo:

* ***main*****:** reflete sempre o código em ambiente de produção  
* ***develop*****:** versão mais atualizada e completa do código, ainda em validação  
* ***release*****/vX.Y.Z:** *branch* de preparação para a *release*, criada a partir da *develop*  
* ***hotfix*****/vX.Y.Z:** *branch* para correções urgentes em produção

***Tags*****:** Toda *release* bem-sucedida deve gerar uma *tag* semântica imutável (ex: v1.4.2).

## **3\. Ambientes de *Staging* e *Prod***

Exemplo Prod: v1.0.0 \-\> Versão 1.0.0 com as seguintes funcionalidades:

* Descrição completa das alterações incluídas na versão.

Exemplo QA: qa-v1.0.0 \-\> Versão de validação 1.0.0, \<Motivo da correção\> 

### **Histórico de versões e subidas**

Detalhar essa parte  
http://<coolify-host>/

## **4\. Passo a Passo do Processo de Execução**

O processo é dividido em três etapas obrigatórias:

1. **Pré-*Release*:**  
   * Garantir que todos os testes e alterações estejam aprovados na esteira de *CI*.  
   * Gerar o *Changelog* com a lista de funcionalidades e correções incluídas.  
   * Congelar novas alterações (*Code Freeze*) na *branch* de *release*.  
2. **Execução (*Deploy*):**  
   * Realizar o *backup* preventivo do banco de dados e estados da aplicação.  
   * Disparar a esteira de *CD* para o ambiente de produção.  
   * Monitorar os *logs* em tempo real durante a virada de chave.  
3. **Pós-*Release* (*Sanity Check*):**  
   * Executar testes nas principais mecânicas do jogo e jornadas do usuário.  
   * Validar métricas de performance e infraestrutura (*CPU*, Memória, Erros).

## **5\. Plano de *Rollback* (Retorno de Versão)**

Caso a *release* apresente instabilidade insustentável na etapa de Pós-*Release*, os seguintes critérios e passos de *rollback* devem ser acionados imediatamente:

### **Critérios de Ativação**

* Indisponibilidade total do sistema sem diagnóstico rápido.  
* Falha crítica em fluxo importante ou *core business*.  
* Taxa de erro superior a 5% nas requisições globais após o *deploy*.

### **Procedimento de *Rollback***

1. **Passo 1:** Interromper o tráfego para a nova versão, redirecionando 100% dos usuários para o cluster ou container contendo a versão anterior estável (validar no histórico).  
2. **Passo 2:** Se houver alteração de esquema no banco de dados (*migrations*), aplicar o *script* de reversão correspondente, garantindo a integridade dos dados inseridos no intervalo.  
3. **Passo 3:** Notificar a equipe e stakeholders sobre o retorno à versão anterior.  
4. **Passo 4:** Abrir uma sessão de *Post-Mortem* em até 24 horas para analisar a causa raiz da falha.