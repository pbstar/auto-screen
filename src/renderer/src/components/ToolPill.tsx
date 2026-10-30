import { useCallback, useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import { monoText } from '../theme'
import PopoverPill from './PopoverPill'

const api = window.autoScreen

/** 工具清单始终生效、只读，和技能并排放：脚本跟着技能走，工具单独一个入口 */
export default function ToolPill() {
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    void api.listTools().then((result) => {
      if (result.ok) setTools(result.data)
      else setError(result.error)
    })
  }, [])

  useEffect(reload, [reload])

  return (
    <PopoverPill
      label="工具"
      detail={tools.length > 0 ? String(tools.length) : undefined}
      onOpen={reload}
    >
      {error && (
        <Typography variant="caption" sx={{ display: 'block', color: 'error.main' }}>
          加载失败：{error}
        </Typography>
      )}
      <Box sx={{ pt: 0.5 }}>
        {tools.length === 0 ? (
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}
          >
            加载中…
          </Typography>
        ) : (
          tools.map((tool) => <ToolRow key={tool.name} tool={tool} />)
        )}
      </Box>
    </PopoverPill>
  )
}

function ToolRow({ tool }: { tool: ToolSummary }) {
  return (
    <Box sx={{ py: 0.5 }}>
      <Typography sx={{ ...monoText(12), fontWeight: 600 }}>{tool.name}</Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}
      >
        {tool.description}
      </Typography>
    </Box>
  )
}
