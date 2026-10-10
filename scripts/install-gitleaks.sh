#!/usr/bin/env bash
# Installs a pinned gitleaks release after verifying its sha256 against the
# checksums published with that release. Used by CI; fine for local use too.
#
#   scripts/install-gitleaks.sh [dest-dir]     (default: .tools/bin)
#
# To upgrade: bump GITLEAKS_VERSION, replace every checksum from
# https://github.com/gitleaks/gitleaks/releases/download/v<ver>/gitleaks_<ver>_checksums.txt
set -euo pipefail

GITLEAKS_VERSION="8.30.1"
declare -A SHA256=(
  [linux_x64]="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
  [linux_arm64]="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080"
  [darwin_x64]="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709"
  [darwin_arm64]="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"
)

dest="${1:-.tools/bin}"
os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"
case "$arch" in
  x86_64 | amd64) arch="x64" ;;
  aarch64 | arm64) arch="arm64" ;;
  *) echo "install-gitleaks: unsupported architecture $arch" >&2; exit 1 ;;
esac
platform="${os}_${arch}"
expected="${SHA256[$platform]:-}"
if [[ -z "$expected" ]]; then
  echo "install-gitleaks: no pinned checksum for $platform" >&2
  exit 1
fi

if [[ -x "$dest/gitleaks" ]] && "$dest/gitleaks" version 2>/dev/null | grep -q "^${GITLEAKS_VERSION}$"; then
  echo "$dest/gitleaks"
  exit 0
fi

archive="gitleaks_${GITLEAKS_VERSION}_${platform}.tar.gz"
url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${archive}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL --retry 3 -o "$tmp/$archive" "$url"
actual="$(sha256sum "$tmp/$archive" | cut -d' ' -f1)"
if [[ "$actual" != "$expected" ]]; then
  echo "install-gitleaks: checksum mismatch for $archive" >&2
  echo "  expected $expected" >&2
  echo "  actual   $actual" >&2
  exit 1
fi

mkdir -p "$dest"
tar -xzf "$tmp/$archive" -C "$tmp" gitleaks
install -m 0755 "$tmp/gitleaks" "$dest/gitleaks"
echo "$dest/gitleaks"
