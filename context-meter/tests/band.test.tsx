import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'context-meter',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

const SURFACES = ['terminal', 'desktop', 'mobile'] as const

// Nothing sits beneath the plugin: each hook here stands for the engine.
const engine = (on: On) => {
  const log: string[] = []
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('ui.status', (_, e) => {
    log.push(`status:${e.text}`)
    return { value: undefined }
  })
  on('ui.toast', (_, e) => {
    log.push(`toast:${e.text}`)
    return { value: undefined }
  })
  return log
}

const measure = (tokens: number, percent: number) => ({
  context: { tokens, window: 1000000, percent },
  rateLimits: [],
  changed: ['context' as const],
})

test('the band shows the meter, on every surface', async ($, on) => {
  engine(on)
  await $.session.measure(measure(140000, 14))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const row = await ui.find({ type: 'Text', text: /ctx 14%/ })
    expect(row?.text).toBe('ctx 14% (140k/1000k)')
    await ui.unmount()
  }
})

test('past the handoff line the band says so, and the status comes before the toast', async ($, on) => {
  const log = engine(on)
  await $.session.measure(measure(300000, 30))

  expect(log).toEqual([
    'status:ctx 30% (300k/1000k) - handoff due',
    "toast:Context is 30% full. Reply 'handoff' to move to a new session.",
  ])

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const row = await ui.find({ type: 'Text', text: /handoff due/ })
    expect(row?.text).toBe('ctx 30% (300k/1000k) - handoff due')
    await ui.unmount()
  }
})

test('the band yields to a survey', async ($, on) => {
  engine(on)
  await $.session.measure(measure(140000, 14))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, hasSurvey: true } })
    expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
    expect(await ui.keepsBeneath()).toBe(true)
    await ui.unmount()
  }
})

test('the band is empty before the first measurement', async ($, on) => {
  engine(on)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
    expect(await ui.keepsBeneath()).toBe(true)
    await ui.unmount()
  }
})

test('a mounted band follows the next measurement', async ($, on) => {
  engine(on)
  await $.session.measure(measure(140000, 14))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toBe('ctx 14% (140k/1000k)')

    await $.session.measure(measure(200000, 20))
    expect((await ui.find({ type: 'Text', text: /ctx/ }))?.text).toBe('ctx 20% (200k/1000k)')

    await $.session.measure(measure(140000, 14))
    await ui.unmount()
  }
})
