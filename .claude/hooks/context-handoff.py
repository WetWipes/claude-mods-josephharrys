#!/usr/bin/env python3
"""Context handoff hook.

Reads hook JSON on stdin, finds the last assistant usage in the transcript,
and once context use passes HANDOFF_PCT tells Claude to hand off to a new
session. Silent below the threshold. Re-nags every HANDOFF_REPEAT_PCT more.

Env: HANDOFF_PCT (default 25), HANDOFF_REPEAT_PCT (default 5),
CLAUDE_CTX_WINDOW (tokens; default 1M if the model name has "1m", else 200k).
"""
import json, os, sys

PCT = float(os.environ.get("HANDOFF_PCT", "25"))
REPEAT = float(os.environ.get("HANDOFF_REPEAT_PCT", "5"))


def last_usage(path):
    usage, model = None, ""
    try:
        with open(path) as f:
            for line in f:
                try:
                    d = json.loads(line)
                except ValueError:
                    continue
                m = d.get("message") or {}
                if d.get("type") == "assistant" and m.get("usage"):
                    usage, model = m["usage"], m.get("model", "") or model
    except OSError:
        pass
    return usage, model


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        return
    usage, model = last_usage(data.get("transcript_path", ""))
    if not usage:
        return
    tokens = sum(usage.get(k, 0) or 0 for k in (
        "input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
    window = int(os.environ.get("CLAUDE_CTX_WINDOW") or (1_000_000 if "1m" in model.lower() else 200_000))
    pct = tokens * 100 / window
    if pct < PCT:
        return
    state = f"/tmp/handoff-{data.get('session_id', 'x')}"
    last = 0.0
    try:
        last = float(open(state).read())
    except (OSError, ValueError):
        pass
    if last and pct < last + REPEAT:
        return
    try:
        open(state, "w").write(str(pct))
    except OSError:
        pass
    msg = (
        f"[context-handoff] Context is {pct:.0f}% full ({tokens//1000}k of {window//1000}k). "
        "Do NOT start a handoff yet. Finish what the user asked, then add one line at the end of your reply: "
        "\"Context is " + f"{pct:.0f}" + "% full. Reply 'handoff' and I'll start a new session.\" "
        "Do not call create_session, send_message or archive_session until the user's own message says handoff. "
        "When the user says handoff:\n"
        "1. Write a brief with headings GOAL, DONE (with file paths), STATE (branches, anything living only in this container), OPEN ITEMS, NEXT STEPS. Plain prose.\n"
        "2. create_session (claude-code-remote) with a clear title, then send_message the brief to it.\n"
        "3. Tell the user in two lines that the handoff happened.\n"
        "4. Stay open for the new session's questions. After it confirms it has picked up the work, archive_session this one."
    )
    event = data.get("hook_event_name") or "UserPromptSubmit"
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": msg}}))


main()
