# claude-mods-josephharrys

Personal Claude Code setup: mods, agents, and the working rules Claude follows.



## context-meter

Shows context window fill in the status line and in a one-row band above the prompt (`ctx 14% (140k/1000k)`). At 25% it toasts and attaches handoff instructions to your next prompt: Claude writes a structured brief (goal, done, state, open items, next steps), starts a new session, sends it the brief, stays open for questions, then archives itself once the new session confirms.

Install: `/plugin install context-meter --marketplace <owner>/claude-mods-josephharrys`

Change the threshold with the `HANDOFF` constant in `context-meter/hooks/register.tsx`.

## Caveman (terse output)

docs/OUTPUT_STYLE.md is a short built-in version. For the full thing, install the third-party plugin yourself:

`claude plugin marketplace add JuliusBrussee/caveman` then `claude plugin install caveman@caveman`

## No plugin support? Use the hook

Where `/plugin` isn't available (web app, cloud sessions), `.claude/settings.json` registers `.claude/hooks/context-handoff.py`. Any session with this repo attached loads it. At 25% context it makes Claude ask you; reply `handoff` and it writes the brief, starts a new session and archives the old one. (Auto mode blocks sessions that a hook starts on its own, so your reply is what authorises it.) Change the line with `HANDOFF_PCT`; set `CLAUDE_CTX_WINDOW` (tokens) if the window guess is wrong. It can't draw a status line; the plugin does that.


If your model's window isn't 1M, change `CLAUDE_CTX_WINDOW` in `.claude/settings.json` (tokens, e.g. 200000).
