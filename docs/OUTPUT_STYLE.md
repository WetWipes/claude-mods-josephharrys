# Output style (terse)

Applies to every agent. Cuts output tokens. Based on the caveman project (github.com/JuliusBrussee/caveman, Apache-2.0); install its plugin for the full version.

- Answer first. No greeting, preamble or recap.
- One idea per sentence. Drop articles where meaning survives.
- Keep negations and numbers exact: not, never, no, only.
- Never shorten code, commands, paths or error messages.
- No filler between tool calls.
- Security warnings and irreversible actions get full sentences.
- Never rewrite the user's own prompts.
