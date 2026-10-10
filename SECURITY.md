# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub's **Report a vulnerability** form on this repository (Security tab). Don't open a public issue. You'll get an acknowledgement within 7 days.

## What Gitleaf promises

- **Secrets never live in the repo.** Docs and config hold `secret://…` references only. The CLI rejects a value where a reference is expected (ST-PV13MRCY). Secret scanning with gitleaks runs locally as a pre-commit hook and over the full history in CI; see below.
- **Repo content is untrusted input to agents.** Tool results wrap file content as data. Agents can't approve or merge, and write actions require confirmation.
- **Webviews run under `default-src 'none'`.** Appearance packs are declarative (CSS custom properties, sanitized SVG, JSON copy). No pack code runs.
- **Restricted Mode is read-only.** Workspace Trust support is `limited`.

## Secret scanning: how it's enforced

| Layer | What runs | Fails on |
|---|---|---|
| Pre-commit hook (`.pre-commit-config.yaml`, gitleaks v8.30.1) | `gitleaks git --pre-commit --redact --staged --verbose` | any finding in staged changes |
| CI, GitHub Actions and Azure Pipelines (`secrets` job) | `scripts/install-gitleaks.sh` downloads the pinned release and verifies its sha256 against the published checksums, then runs `gitleaks git` over the **full history** (`fetch-depth: 0`) | any finding in any commit, or a checksum mismatch |
| CI, same job | `scripts/test-secret-guard.sh` | the guard **not** blocking a planted fake key |

Rules come from the gitleaks default set, extended by `.gitleaks.toml`. Every allowlist entry there is explicit and commented. There are no `|| true` wrappers anywhere.

### Verify the guard yourself (the planted-key test)

1. Install the hook once per clone: `pre-commit install`.
2. Run the automated proof, which plants a syntactically valid fake AWS access key id in a throwaway repo and asserts gitleaks blocks it both as a staged change and in history:

   ```sh
   pnpm check:secrets          # full-history scan of this repo, then the plant test
   ```

3. Manual version: in a scratch clone, write a fake key such as `AKIA` followed by sixteen characters from `A-Z2-7` into any file, `git add` it, and `git commit`. The hook must refuse the commit and print the redacted finding. Push the same commit to a branch and the CI `secrets` job must fail.

If any of these passes when it should fail, treat it as a security bug and report it as described above.

## Supported versions

Gitleaf is pre-release. Only the `main` branch receives fixes.
