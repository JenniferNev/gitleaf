#!/usr/bin/env bash
# Identity guard: fails if personal identity assets or names enter this public (MIT) repository.
# Personal identity lives in private appearance packs. See docs/design/appearance-packs.md.
set -euo pipefail
PATTERN='zonami|project[ _-]?fox|fox[_-]identity|petthe|jenn[ _]?web[ _]?ico|jenn_ico'
fail=0
if git ls-files | grep -iE "$PATTERN"; then
  echo "identity-guard: file names above look like private identity assets." >&2; fail=1
fi
if git grep -nIiE "$PATTERN" -- . ':!scripts/check-identity.sh'; then
  echo "identity-guard: text above references private identity. Move it to the private pack." >&2; fail=1
fi
exit $fail
