# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's **Report a vulnerability** form on this repository (Security tab). Don't open a public issue. You'll get an acknowledgement within 7 days.

## What Gitleaf promises

- **Secrets never live in the repo.** Docs and config hold `secret://…` references only. The CLI rejects a value where a reference is expected. Secret scanning (gitleaks) runs as a pre-commit hook and over the full history in CI; that story is ST-1BEP9591.
- **Repo content is untrusted input to agents.** Tool results wrap file content as data. Agents can't approve or merge, and write actions require confirmation.
- **Webviews run under `default-src 'none'`.** Appearance packs are declarative (CSS custom properties, sanitized SVG, JSON copy). No pack code runs.
- **Restricted Mode is read-only.** Workspace Trust support is `limited`.

## Supported versions

Gitleaf is pre-release. Only the `main` branch receives fixes.
