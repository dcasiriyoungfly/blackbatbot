#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")" || exit 1

need_node() {
  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi

  major="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  [ "${major:-0}" -lt 18 ]
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "Node.js 18+ is required, but sudo is not available to install it." >&2
    exit 1
  fi
}

install_node_linux() {
  echo "Installing Node.js 20 LTS..."

  if command -v apt-get >/dev/null 2>&1; then
    as_root apt-get update
    as_root apt-get install -y ca-certificates curl gnupg
    curl -fsSL https://deb.nodesource.com/setup_20.x | as_root bash -
    as_root apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    as_root dnf install -y nodejs npm
  elif command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | as_root bash -
    as_root yum install -y nodejs
  elif command -v pacman >/dev/null 2>&1; then
    as_root pacman -Sy --needed --noconfirm nodejs npm
  elif command -v zypper >/dev/null 2>&1; then
    as_root zypper --non-interactive install nodejs20 npm20
  elif command -v apk >/dev/null 2>&1; then
    as_root apk add nodejs npm
  else
    echo "No supported package manager found. Install Node.js 18+ manually, then run ./start.sh again." >&2
    exit 1
  fi
}

if need_node; then
  install_node_linux
fi

if need_node; then
  echo "Node.js 18+ is still not available after installation." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found after installing Node.js." >&2
  exit 1
fi

npm start
