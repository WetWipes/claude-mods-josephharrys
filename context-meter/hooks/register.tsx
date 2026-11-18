import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// The meter's text, for the band above the prompt.
const band = atom({ plugin: 'context-meter', key: 'line' } as const, '')

// Percent of the window at which the handoff kicks in.
const HANDOFF = 25
// Nag again each time usage grows by this many more points.
const REPEAT = 5

const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

const PROTOCOL = (pct: number) => `[context-meter] This session's context is ${pct}% full, past the ${HANDOFF}% handoff line. Do NOT start a handoff yet. Finish what the user asked, then end your reply with one line: "Context is ${pct}% full. Reply 'handoff' and I'll start a new session." Do not call create_session, send_message or archive_session until the user's own message says handoff. When they do:
1. Write a short brief with these headings: GOAL, DONE (with file paths), STATE (branches, anything that lives only in this container), OPEN ITEMS, NEXT STEPS. Plain prose, no filler.
2. create_session (claude-code-remote) with a clear title, then send_message the brief to it.
3. Tell the user in two lines that the handoff happened.
4. Stay open for the new session's questions. Once it confirms it has picked up the work, archive_session this one.`

export const register: Register = on => {
  let percent = 0
  let lastNag = 0

  on('session.measure', async ($, e, next) => {
    const { tokens, window, percent: p } = e.context

    if (tokens === undefined || p === undefined) {
      return next(e)
    }

    percent = p
    if (p < lastNag) lastNag = 0 // compaction or /clear

    const text = `ctx ${p}% (${fmt(tokens)}/${fmt(window)})${p >= HANDOFF ? ' - handoff due' : ''}`
    $.ui.status(text)

    if (p >= HANDOFF && (lastNag === 0 || p >= lastNag + REPEAT)) {
      $.ui.toast(`Context is ${p}% full. Reply 'handoff' to move to a new session.`)
    }

    await update($, band, () => text)

    return next(e)
  })

  // The same text as a one-row band above the prompt.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = await read($, band)

    if (e.props.hasSurvey || !text) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor wrap="truncate-end">{text}</Text>
      </Box>
    )
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
