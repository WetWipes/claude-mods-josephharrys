import type { Register } from 'claude-code'

// Percent of the window at which the handoff kicks in.
const HANDOFF = 25
// Nag again each time usage grows by this many more points.
const REPEAT = 5

const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

const PROTOCOL = (pct: number) => `[context-meter] This session's context is ${pct}% full, past the ${HANDOFF}% handoff line. Hand off now, before doing anything else the user asked for next, so the prompt cache stays warm:
1. Write a short handoff brief with these headings: GOAL (what the user is after), DONE (what is finished, with file paths), STATE (branches, running things, anything that lives only in this container), OPEN ITEMS (questions waiting on the user, decisions pending), NEXT STEPS (ordered). Plain prose, no filler.
2. Start the new session with create_session (claude-code-remote). Give it a clear title. Then send_message the brief to it.
3. Tell the user in two lines that the handoff happened and which session took over.
4. Stay open for questions from the new session. Once it confirms it has picked up the work, archive_session this one.
If the user has just asked something small, answer it in one line first, then hand off.`

export const register: Register = on => {
  let percent = 0
  let lastNag = 0

  on('session.measure', ($, e, next) => {
    const { tokens, window, percent: p } = e.context

    if (tokens === undefined || p === undefined) {
      return next(e)
    }

    percent = p
    if (p < lastNag) lastNag = 0 // compaction or /clear

    $.ui.status(`ctx ${p}% (${fmt(tokens)}/${fmt(window)})${p >= HANDOFF ? ' - handoff due' : ''}`)

    if (p >= HANDOFF && (lastNag === 0 || p >= lastNag + REPEAT)) {
      $.ui.toast(`Context is ${p}% full. Handing off to a new session.`)
    }

    return next(e)
  })

  // Attach the handoff instructions to the user's next prompt. This goes in
  // the turn, not the system prompt, so the cached prefix is untouched.
  on('prompt.submit', ($, e, next) => {
    const isDue = percent >= HANDOFF && (lastNag === 0 || percent >= lastNag + REPEAT)

    if (!isDue || e.isMeta || e.command) {
      return next(e)
    }

    lastNag = percent

    return next({ ...e, context: [...(e.context ?? []), PROTOCOL(percent)] })
  })
}
