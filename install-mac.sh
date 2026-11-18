#!/bin/bash
# Installs this repo's agents, rules and handoff hook into ~/.claude. Safe to re-run.
set -e
URL="${REPO_URL:-https://github.com/WetWipes/claude-mods-josephharrys.git}"
R="$HOME/claude-mods-josephharrys"
if [ -d "$R/.git" ]; then git -C "$R" pull --ff-only; else git clone "$URL" "$R"; fi
mkdir -p ~/.claude/agents
cp "$R"/.claude/agents/*.md ~/.claude/agents/
printf '@%s/CLAUDE.md\nThe docs/ files that CLAUDE.md names live in %s/docs/.\n' "$R" "$R" > ~/.claude/CLAUDE.md
[ -f ~/.claude/settings.json ] && cp ~/.claude/settings.json ~/.claude/settings.json.bak
python3 - "$R" <<'PY'
import json, os, sys
r = sys.argv[1]
p = os.path.expanduser("~/.claude/settings.json")
try:
    s = json.load(open(p))
except Exception:
    s = {}
cmd = 'python3 "%s/.claude/hooks/context-handoff.py"' % r
for ev in ("UserPromptSubmit", "PostToolUse"):
    hs = s.setdefault("hooks", {}).setdefault(ev, [])
    if not any(x.get("command") == cmd for h in hs for x in h.get("hooks", [])):
        hs.append({"hooks": [{"type": "command", "command": cmd, "timeout": 10}]})
s.setdefault("env", {})["CLAUDE_CTX_WINDOW"] = "1000000"
json.dump(s, open(p, "w"), indent=2)
PY
echo "Done. Agents:"; ls ~/.claude/agents
