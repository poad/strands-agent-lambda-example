#!/bin/sh

CUR=$(pwd)

CURRENT=$(cd "$(dirname "$0")" || exit;pwd)
echo "${CURRENT}"


if ! (cd "${CURRENT}" || exit); then
  cd "${CUR}" || exit
  exit 1
fi

if ! (git pull --prune); then
  cd "${CUR}" || exit
  exit 1
fi

if ! (cd "${CURRENT}/" || exit); then
  cd "${CUR}" || exit
  exit 1
fi
echo ""
pwd
if ! (disable-checkout-persist-credentials && pnx pnpm@latest self-update  && pnpm install -r && pnpm up -r && pnpm audit --fix override && pnpm up -r && pnpm -r --if-present lint-fix && pnpm --if-present  lint-fix && pnpm -r --if-present build  && pnpm --if-present build && pnpm install -r --no-frozen-lockfile); then
  cd "${CUR}" || exit
  exit 1
fi

if ! (cd "${CURRENT}" || exit); then
  cd "${CUR}" || exit
  exit 1
fi

if ! (git pull --prune && git commit -am "Bumps node modules" && git push --force-with-lease); then
  cd "${CUR}" || exit
  exit 1
fi

cd "${CUR}" || exit
