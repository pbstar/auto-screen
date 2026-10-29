import { useCallback, useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { ToolSummary } from '@shared/types'
import PopoverPill from './PopoverPill'
import ToolList from './ToolList'

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
        <ToolList tools={tools} />
      </Box>
    </PopoverPill>
  )
}
