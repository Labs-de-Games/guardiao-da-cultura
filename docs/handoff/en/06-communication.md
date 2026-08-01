# Communication

## Where the team talks

Discord. Server **42 Rio | Labs**, category **Labs Games Rouanet**.

| Channel | Purpose |
|---|---|
| avisos | Team announcements. Roles, async daily rotation and time off |
| documentacao | Product documents. The PRD link lives here |
| gestão-do-projeto | Tracking. The visual roadmap by epic lives here |
| estudo_conhecimento | Study material and references |
| geral | Day to day conversation |
| daily-async | The written daily |
| notificações | Automated bot output |

Voice rooms: Sala-1, Sala-2, Sala de reuniões, Sala-afk.

## The notifications channel

Two apps post to **notificações**: the **GitHub App** and the **Coolify App**.
The channel is automated output, not conversation.

The GitHub App posts repository movement:

- Branch created
- Branch deleted
- New commits, with short hash, message and author

A typical sequence reads:
`[Labs-de-Games/gameplate] New branch created: feat/labels-level-2-619`,
followed by each commit landing on that branch.

The Coolify App posts deploy status.

## What it is for

The channel is where you confirm an action reached its destination. After a
push, you see whether the branch and commits appeared. After dispatching CD
Production, Coolify reports deploy progress there.

Discussion about a specific change belongs in the Pull Request or the issue,
next to its context. Do not use the notifications channel for conversation:
anything typed there is lost among the automated output.
