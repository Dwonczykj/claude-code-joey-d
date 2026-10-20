import type { Register } from 'claude-code'

import { THEMES, skinFor, summarise } from './skins'

export const register: Register = (on, options) => {
  const palette = THEMES[options.theme as string] ?? THEMES.tokyo

  on('ui.render', { component: 'ToolUse' }, ($, e, next) => {
    const { Box, Text } = $.ui.resolve(e)
    const { tool, input, isRunning, isErrored } = e.props
    const skin = skinFor(tool)
    const color = isErrored ? 'error' : palette[skin.slot]
    const arg = summarise(input)

    return (
      <Box>
        <Text color={color} bold>
          {skin.icon} {tool}
        </Text>
        <Text dimColor={isRunning}>{arg ? ` ${arg}` : ''}</Text>
      </Box>
    )
  })
}
