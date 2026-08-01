# Comunicação

## Onde o time conversa

O time usa o Discord. Servidor **42 Rio | Labs**, categoria **Labs Games
Rouanet**.

| Canal | Para quê |
|---|---|
| avisos | Comunicados do time. Papéis e atuação, escala da daily assíncrona e férias ficam aqui |
| documentacao | Documentos de produto. O link do PRD fica aqui |
| gestão-do-projeto | Acompanhamento. O roadmap visual por épicos fica aqui |
| estudo_conhecimento | Material de estudo e referência |
| geral | Conversa do dia a dia |
| daily-async | A daily, feita por escrito |
| notificações | Saída automática dos bots |

Há também as salas de voz: Sala-1, Sala-2, Sala de reuniões e Sala-afk.

## O canal de notificações

Dois aplicativos publicam em **notificações**: o **GitHub App** e o
**Coolify App**. O canal é saída automática, não conversa.

O GitHub App publica a movimentação do repositório:

- Branch criada
- Branch deletada
- Commits novos, com hash curto, mensagem e autor

Uma sequência típica aparece assim: primeiro
`[Labs-de-Games/gameplate] New branch created: feat/labels-level-2-619`, depois
cada commit que entra naquela branch, com o hash e o autor ao lado.

O Coolify App publica o status dos deploys.

## Para que serve na prática

O canal é onde você confirma que uma ação chegou ao destino.

Depois de dar push, é ali que você vê se a branch e os commits apareceram.
Depois de disparar o CD Production, é ali que o Coolify reporta o andamento do
deploy.

Discussão sobre uma mudança específica fica na Pull Request ou na issue, junto
do contexto. O canal de notificações não é lugar de conversa: mensagem escrita
ali se perde no meio da saída automática dos bots.
