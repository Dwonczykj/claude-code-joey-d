import { expect, test } from 'claude-code/testing'

const props = (bodyColumns: number) => ({
  title: 'Build Room',
  isFocused: false,
  bodyColumns,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
})

test('the pane mounts and draws its waiting message on every surface, wide or narrow', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    for (const bodyColumns of [50, 140]) {
      const ui = await $.ui.mount({
        plugin: 'build-room-view',
        surface,
        component: 'Pane',
        requestId: 'build-room-view',
        props: props(bodyColumns),
      })
      expect(await ui.find({ type: 'Text', text: /Looking for a Build Room run/ })).toBeDefined()
      await ui.unmount()
    }
  }
})
