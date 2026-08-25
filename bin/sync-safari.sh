#!/usr/bin/env bash
# Installe le userscript dans le dossier que lit Userscripts.
#
# Ce dossier est SOUS SANDBOX : l'extension ne lit que le sien, et le bouton
# dossier de son popup le REVELE, il ne le choisit pas. On y depose donc une
# copie plutot que de deplacer le dossier de travail. Un lien symbolique vers
# ~/dev ne marcherait pas : il sort du bac a sable.
#
#   ./bin/sync-safari.sh          installe hn-redesign
#   ./bin/sync-safari.sh --spike  installe le spike T1 a la place
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="$HOME/Library/Containers/com.userscripts.macos.Userscripts-Extension/Data/Documents/scripts"
[ -d "$DEST" ] || { echo "dossier Userscripts introuvable — l'extension a-t-elle ete lancee au moins une fois ?"; exit 1; }

if [ "${1:-}" = "--spike" ]; then
  rm -f "$DEST/hn-redesign.user.js"
  cp t1-spike.user.js "$DEST"/
  echo "spike T1 installe, hn-redesign retire — les deux ensemble se disputent la navbar"
else
  rm -f "$DEST/t1-spike.user.js"
  cp hn-redesign.user.js "$DEST"/
  echo "hn-redesign $(grep -m1 '@version' hn-redesign.user.js | awk '{print $3}') installe"
fi

echo "Recharger news.ycombinator.com."
ls -la "$DEST"
