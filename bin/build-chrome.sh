#!/usr/bin/env bash
# Reconstruit l'extension Chrome depuis le userscript.
#
# Le script est la SOURCE, l'extension en est une copie. Pas l'inverse, et
# surtout pas deux fichiers a maintenir : la copie est verifiee octet par
# octet par node test/lint.mjs, qui echoue si elle a derive.
#
#   ./bin/build-chrome.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=hn-redesign.user.js
DEST=chrome/hn-redesign.js
MANIFEST=chrome/manifest.json

VERSION=$(grep -m1 '@version' "$SRC" | awk '{print $3}')
[ -n "$VERSION" ] || { echo "pas de @version dans $SRC"; exit 1; }

cp "$SRC" "$DEST"

# La version du manifeste suit celle du userscript : une seule source.
python3 - "$MANIFEST" "$VERSION" <<'PY'
import json, sys
p, v = sys.argv[1], sys.argv[2]
m = json.load(open(p))
m['version'] = v
json.dump(m, open(p, 'w'), indent=2, ensure_ascii=False)
open(p, 'a').write('\n')
PY

echo "chrome/ reconstruit — version $VERSION, $(wc -l < "$DEST" | tr -d ' ') lignes"
