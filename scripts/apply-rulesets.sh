#!/usr/bin/env bash
# Sync the branch rulesets in .github/rulesets/ with GitHub.
#
#   scripts/apply-rulesets.sh apply   create or update each ruleset (safe to re-run)
#   scripts/apply-rulesets.sh diff    show drift between GitHub and the committed files
#
# Needs the GitHub CLI logged in with admin rights on the repository, and jq.
# Rulesets are only available on public repositories (or with GitHub Pro).

set -euo pipefail

RULESETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/.github/rulesets"
# Keys compared by `diff`. GitHub adds others (id, timestamps, links) that we ignore.
KEYS='{name, target, enforcement, conditions, rules, bypass_actors}'

usage() {
  echo "Usage: $0 apply|diff" >&2
  exit 2
}

for cmd in gh jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: $cmd is required" >&2
    exit 1
  fi
done

[ $# -eq 1 ] || usage
MODE="$1"
[ "$MODE" = apply ] || [ "$MODE" = diff ] || usage

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

if ! LIVE="$(gh api "repos/$REPO/rulesets" 2>&1)"; then
  if grep -q "HTTP 403" <<<"$LIVE"; then
    echo "error: rulesets need a public repository or GitHub Pro; apply them after the open-source switch" >&2
  else
    echo "$LIVE" >&2
  fi
  exit 1
fi

status=0
for file in "$RULESETS_DIR"/*.json; do
  name="$(jq -r .name "$file")"
  id="$(jq -r --arg name "$name" '.[] | select(.name == $name) | .id' <<<"$LIVE")"

  if [ "$MODE" = apply ]; then
    if [ -n "$id" ]; then
      gh api --method PUT "repos/$REPO/rulesets/$id" --input "$file" >/dev/null
      echo "updated $name ($id)"
    else
      gh api --method POST "repos/$REPO/rulesets" --input "$file" >/dev/null
      echo "created $name"
    fi
    continue
  fi

  if [ -z "$id" ]; then
    echo "missing on GitHub: $name"
    status=1
    continue
  fi
  if ! diff -u \
    --label "github/$name" <(gh api "repos/$REPO/rulesets/$id" | jq -S "$KEYS") \
    --label "$file" <(jq -S "$KEYS" "$file"); then
    status=1
  fi
done

if [ "$MODE" = diff ] && [ "$status" -eq 0 ]; then
  echo "rulesets match the committed files"
fi
exit "$status"
