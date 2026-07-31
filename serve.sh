#!/bin/bash
# Local preview server. Serves the site at http://localhost:8000
# Routes like /isabelle-lake/ work because each is a real directory with an index.html.
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo "→ http://localhost:$PORT"
echo "  collection routes: http://localhost:$PORT/isabelle-lake/"
echo "  (ctrl-C to stop)"
python3 -m http.server "$PORT"
