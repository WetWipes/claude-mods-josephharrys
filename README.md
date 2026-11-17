# claude-mods-josephharrys

Personal Claude Code setup: mods, agents, and the working rules Claude follows.



## context-meter

Shows context window fill in the status line (`ctx 14% (140k/1000k)`). At 25% it toasts and attaches handoff instructions to your next prompt: Claude writes a structured brief (goal, done, state, open items, next steps), starts a new session, sends it the brief, stays open for questions, then archives itself once the new session confirms.

Install: `/plugin install context-meter --marketplace <owner>/claude-mods-josephharrys`

Change the threshold with the `HANDOFF` constant in `context-meter/hooks/register.ts`.

## Caveman (terse output)

docs/OUTPUT_STYLE.md is a short built-in version. For the full thing, install the third-party plugin yourself:

`claude plugin marketplace add JuliusBrussee/caveman` then `claude plugin install caveman@caveman`
