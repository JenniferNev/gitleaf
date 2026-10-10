# Contributing to Gitleaf

Thanks for helping. Gitleaf keeps documentation as Markdown in git, reviewable and attributable line by line. This repo dogfoods that: the backlog is in `agile/items/`, decisions are in `docs/adr/`, and agents work here under the same rules as people.

## Before you start

1. Read `AGENTS.md`. It applies to humans too.
2. Read `docs/architecture.md` and skim `docs/adr/`. Don't contradict an ADR; supersede it with a new one.
3. Pick an item from `agile/items/`, or open an issue to propose one.

## Setup

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm gitleaf validate
pnpm check:identity
pnpm check:themes      # needs python3
```

Node 24 or newer and pnpm 10 (`corepack enable` or Volta both work).

## Workflow

- Branch as `<type>/<ID>-<slug>`, for example `story/ST-Z3EH27SE-scaffold`.
- Set the item's `status` to `in-progress` in its file, and to `in-review` when you open the PR.
- Add the trailer `Agile-Item: <ID>` to every commit.
- Agent-authored commits keep their attribution trailers (`Co-Authored-By`, `Agent-Trace`, and so on). Never strip them.
- Any change to the architecture, a file format or a dependency needs an ADR in `docs/adr/`, named `YYYY-MM-DD-<slug>.md`.

## Developer Certificate of Origin (DCO)

Every commit must be signed off. By signing off you certify the [Developer Certificate of Origin 1.1](https://developercertificate.org/): you wrote the change or have the right to submit it under the MIT license.

```sh
git commit -s -m "Short summary

Agile-Item: ST-XXXXXXXX"
```

This adds `Signed-off-by: Your Name <you@example.com>`. CI rejects commits without it.

## Definition of Done

- Every acceptance criterion on the item is checked and covered by a test.
- `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm gitleaf validate`, `pnpm check:identity` and `pnpm check:themes` pass.
- Docs and ADRs are updated where behavior changed.
- The PR description lists the acceptance criteria you verified and the commands you ran.

## Hard rules

- `packages/core` imports nothing: no Node built-ins, no `vscode`, no adapters. Lint enforces it.
- No personal identity in this repo (mascots, logos, personal icons, signature shapes). `scripts/check-identity.sh` enforces it.
- Never write a secret value into any file. Only `secret://…` references.
- New dependencies must be MIT, Apache-2.0, BSD or ISC. Fonts must be OFL.
