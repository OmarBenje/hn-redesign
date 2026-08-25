#!/usr/bin/env bash
# Recapture les fixtures de reference depuis Hacker News.
# Les pages ne sont PAS versionnees : ce sont des ecrits d'autres personnes.
# Ce script les reconstruit a la demande pour rejouer les rendus.
set -euo pipefail
OUT="${1:-./fixtures}"
mkdir -p "$OUT"
UA="Mozilla/5.0"

# 1. page d'accueil
curl -s -A "$UA" "https://news.ycombinator.com/" -o "$OUT/news.html"

# 2. le fil le mieux fourni de la page d'accueil
ID=$(grep -o 'class="athing submission" id="[0-9]*"' "$OUT/news.html" | head -1 | grep -o '[0-9]*')
curl -s -A "$UA" "https://news.ycombinator.com/item?id=$ID" -o "$OUT/item.html"

# 3. rendre les URL relatives resolvables hors ligne
for f in "$OUT/news.html" "$OUT/item.html"; do
  perl -0pi -e 's|<head>|<head><base href="https://news.ycombinator.com/">|' "$f"
done

echo "Fixtures ecrites dans $OUT :"
echo "  news.html  $(grep -c 'class="athing submission"' "$OUT/news.html") posts"
echo "  item.html  $(grep -c 'class="athing comtr' "$OUT/item.html") commentaires  (id $ID)"
echo
echo "Les chiffres du DESIGN.md ont ete mesures le 2026-08-25 sur un fil de 206"
echo "commentaires (199 c00, 6 noshow, 1 coll, profondeurs 0 a 4). Un fil capture"
echo "aujourd'hui aura d'autres valeurs : les ratios tiennent, pas les totaux."
