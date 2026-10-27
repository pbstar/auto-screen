import { Box, Typography } from '@mui/material'
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
        <Box key={tool.name} sx={{ py: 0.5 }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 600 }}>
            {tool.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}
          >
            {tool.description}
          </Typography>
        </Box>
      ))}
    </>
  )
}
