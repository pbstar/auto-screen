import { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import type { TimelineItem } from '../hooks/useAgentRun'
import TimelineEntry from './TimelineEntry'

interface Props {
  items: TimelineItem[]
}

export default function Timeline({ items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [items.length])

  return (
    <Box ref={containerRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 1.25 }}>
      {items.length === 0 ? (
        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.secondary', mt: 1.5, textAlign: 'center' }}
        >
          输入任务并开始，这里会逐步显示截图与动作
        </Typography>
      ) : (
        items.map((item) => <TimelineEntry key={item.id} item={item} />)
      )}
    </Box>
  )
}
