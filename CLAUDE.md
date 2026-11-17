# Working rules

Read these before any non-trivial task, and follow them:

- docs/TECH_STACK.md: what we build with. Do not add a dependency or language that isn't listed without asking.
- docs/PATTERNS.md: the design patterns we use and how.
- docs/OUTPUT_STYLE.md: how to write replies. Terse.
- docs/COORDINATOR_PROMPT.md: the prompt that drives the loop below.
- docs/DESIGN_SPEC.md: binding. Deviating from it needs the user's explicit approval first. If the spec and the request conflict, stop and ask.

## Who does what

Models are pinned in .claude/agents/. Use them:

- planner (Sonnet 5.5): splits the task into chunks and plans each.
- builder (Opus): writes the code from an approved plan.
- reviewer (Opus, read-only): checks plans and diffs against the three docs.
- fetcher (Haiku): searching, reading files, pulling facts. Don't use a bigger model for lookup work.

The main session only coordinates. Keep it on Sonnet.

## The loop

Every agent's work is checked by a different, fresh agent. Never let an agent review its own output, and never reuse a reviewer for a second round: start a new one and give it the plan or diff, the docs, and the previous feedback.

1. Split the task into independent chunks and run one planner per chunk in parallel. If the request is ambiguous, ask the user questions first.
2. Each planner writes its plan.
3. Fresh reviewer critiques the plan. Planner applies the feedback. Repeat with a new reviewer only if the changes were large.
4. One builder per chunk implements the approved plan.
5. Fresh reviewer checks the diff against the plan and docs/DESIGN_SPEC.md. Builder fixes what it found. A new reviewer confirms.
6. Report to the user what was built, what the reviewers flagged, and what was changed because of it.

Skip the loop for trivial edits (typos, one-line changes) and say so.
