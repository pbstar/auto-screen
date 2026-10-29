import { Box, Typography } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import { monoText } from '../theme'

/** 工具清单是静态参考，只读展示模型能用的动作 */
export default function ToolList({ tools }: { tools: ToolSummary[] }) {
  if (tools.length === 0) {
    return (
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
        加载中…
      </Typography>
    )
  }

  return (
    <>
      {tools.map((tool) => (
        <Box key={tool.name} sx={{ py: 0.5 }}>
          <Typography sx={{ ...monoText(12), fontWeight: 600 }}>
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
