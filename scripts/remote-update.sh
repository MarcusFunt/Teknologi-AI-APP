#!/usr/bin/env bash
set -euo pipefail

POLL_SECONDS=${POLL_SECONDS:-30}
REBUILD_ON_UPDATE=${REBUILD_ON_UPDATE:-1}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd git
require_cmd docker

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must be run inside the Git repository." >&2
  exit 1
fi

if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  echo "No upstream branch is configured. Run 'git branch --set-upstream-to origin/<branch>' first." >&2
  exit 1
fi

export SERVER_MODE=localtunnel

start_stack() {
  echo "Starting Docker stack (SERVER_MODE=$SERVER_MODE)..."
  docker compose up -d --build
}

update_stack() {
  if [[ "$REBUILD_ON_UPDATE" == "1" ]]; then
    docker compose up -d --build
  else
    docker compose up -d
  fi
}

watch_for_updates() {
  echo "Watching for updates every ${POLL_SECONDS}s..."
  while true; do
    git fetch --prune origin

    local_ref=$(git rev-parse @)
    remote_ref=$(git rev-parse @{u})

    if [[ "$local_ref" != "$remote_ref" ]]; then
      if [[ -n "$(git status --porcelain)" ]]; then
        echo "Local changes detected; skipping update until working tree is clean."
      else
        echo "Update detected. Pulling and restarting stack..."
        git pull --rebase
        update_stack
      fi
    fi

    sleep "$POLL_SECONDS"
  done
}

start_stack
watch_for_updates
