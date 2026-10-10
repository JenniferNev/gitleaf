#!/usr/bin/env bash
# Proves the secret guard blocks a planted credential, locally (staged, pre-commit
# mode) and in history (full scan). Runs in a throwaway repo so nothing touches
# this one. The fake key is assembled at runtime so no secret-shaped string ever
# appears in this file or in git history.
#
#   GITLEAKS=/path/to/gitleaks scripts/test-secret-guard.sh   (default: gitleaks on PATH)
set -euo pipefail

GITLEAKS="${GITLEAKS:-gitleaks}"
# Resolve to an absolute path now: the test changes directory below.
if [[ "$GITLEAKS" == */* ]]; then GITLEAKS="$(cd "$(dirname "$GITLEAKS")" && pwd)/$(basename "$GITLEAKS")"; else GITLEAKS="$(command -v "$GITLEAKS")"; fi
[[ -x "$GITLEAKS" ]] || { echo "secret-guard: gitleaks not found (set GITLEAKS=/path/to/gitleaks)" >&2; exit 2; }
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config="$repo_root/.gitleaks.toml"

# gitleaks exits with LEAK_CODE only when it finds a leak, so a tool or config
# error (exit 1) can never pass as "blocked".
LEAK_CODE=7
scan() { # scan <args...> -> returns gitleaks' exit code
  "$GITLEAKS" git --config "$config" --redact --no-banner --exit-code "$LEAK_CODE" "$@" . >/dev/null 2>&1
}
expect() { # expect <code> <description> <args...>
  local want="$1" what="$2"; shift 2
  local got=0; scan "$@" || got=$?
  if [[ "$got" != "$want" ]]; then
    echo "secret-guard: FAIL: $what (gitleaks exit $got, expected $want)" >&2
    "$GITLEAKS" git --config "$config" --redact --no-banner --exit-code "$LEAK_CODE" "$@" . >&2 || true
    exit 1
  fi
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
git init -q -b main
git config user.name "Secret Guard Test"
git config user.email "secret-guard@example.invalid"

# A syntactically valid AWS access key id that is not a real credential: the
# sample gitleaks itself uses to validate its aws-access-token rule. Real key ids
# only use [A-Z2-7] after the prefix, so a stray 0/1/8/9 would not count.
# Built from parts so the pattern never exists in this script.
prefix="AK"; prefix+="IA"
fake_key="${prefix}$(printf '%s' 'LALEMEL33243OLIB')"

echo "# clean" > README.md
git add README.md && git commit -q -m "clean commit"

expect 0 "clean history should pass"
echo "secret-guard: clean history passes"

printf 'aws_access_key_id = %s\n' "$fake_key" > settings.ini
git add settings.ini
expect "$LEAK_CODE" "staged fake key should be blocked in pre-commit mode" --pre-commit --staged
echo "secret-guard: staged fake key is blocked (pre-commit mode)"

git commit -q -m "plant fake key"
expect "$LEAK_CODE" "committed fake key should be found by the full-history scan"
echo "secret-guard: committed fake key is found by the full-history scan"
echo "secret-guard: OK"
