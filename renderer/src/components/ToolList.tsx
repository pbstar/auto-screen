import { Box, Tooltip, Typography } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import { MONO_FONT } from '../theme'

interface Props {
  tools: ToolSummary[]
  error: string
}

export default function ToolList({ tools, error }: Props) {
  if (error) {
    return (
      <Typography variant="caption" sx={{ display: 'block', color: 'error.main', mt: 0.5 }}>
        工具列表加载失败：{error}
      </Typography>
    )
  }

  if (tools.length === 0) {
    return (
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
        加载中…
      </Typography>
    )
  }

  return (
    <>
      {tools.map((tool) => (
        <Box key={tool.name} sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, py: 0.4 }}>
          <Typography
            sx={{ fontFamily: MONO_FONT, fontSize: 11.5, width: 76, flex: 'none', fontWeight: 600 }}
          >
            {tool.name}
          </Typography>
          <Tooltip title={tool.description} placement="left">
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'text.secondary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {tool.description}
            </Typography>
          </Tooltip>
        </Box>
      ))}
    </>
  )
}
