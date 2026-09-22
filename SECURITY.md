# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it through GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/Labs-de-Games/gameplate/security)
   of this repository.
2. Choose **Report a vulnerability**.
3. Describe what you found, how to reproduce it, and what an attacker could do
   with it.

The report stays private between you and the maintainers until a fix is
published. [@anacarla-42](https://github.com/anacarla-42) is the responder and
follows the advisory notifications.

There is no security email address. The private advisory is the channel.

## What to expect

| Step | Target |
|---|---|
| Acknowledgement that the report was received | within 5 working days |
| An initial assessment — is it a vulnerability, and how severe | within 10 working days |
| A fix or a stated plan, for a confirmed vulnerability | agreed with you in the advisory thread |

This is a publicly funded educational project maintained by a small team, not a
product with a 24/7 on-call rotation. We will tell you honestly where a report
sits rather than let it go quiet.

If you would like credit in the published advisory, say so in the report.

## Scope

In scope:

- The application code in this repository — the Next.js frontend, the NestJS
  API, and the Docker and nginx configuration it ships.
- Authentication and session handling: the magic-link flow, JWT access tokens
  and refresh tokens.
- Anything that lets one player read or change another player's data.
- Secrets or credentials exposed by the repository itself.

Out of scope:

- Deployed instances run by third parties. Report those to whoever runs them.
- Vulnerabilities in third-party dependencies with no exploitable path in this
  code — report those upstream. If the path *is* exploitable here, it is in
  scope; please say how.
- Findings from an automated scanner with no demonstrated impact.
- Missing hardening headers or best-practice recommendations with no concrete
  attack. These are welcome as ordinary issues.
- Social engineering, physical access, and denial of service by traffic volume.

## Supported versions

Only the latest release and the current `develop` branch receive security
fixes. Older tags are historical.

## Handling of personal data

The game stores an email address, gameplay progress and badge state. If a
report involves personal data, mention it — it changes how we prioritise the
fix and whether disclosure needs to be coordinated with the institutions behind
the project.
