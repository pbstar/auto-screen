import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { TimelineItem } from '../hooks/useAgentRun'
import TimelineEntry from './TimelineEntry'
import ShotDialog from './ShotDialog'

interface Props {
  items: TimelineItem[]
  runId: string
}

export default function Timeline({ items, runId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<TimelineItem | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [items.length])

  return (
    <Box ref={containerRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, py: 1.5 }}>
      {items.length === 0 ? (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            px: 3,
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>还没有开始</Typography>
          <Typography variant="caption" sx={{ mt: 0.75, color: 'text.secondary' }}>
            输入任务后点「开始」
            <br />
            每一步的截图和动作会出现在这里
          </Typography>
        </Box>
      ) : (
        items.map((item) => (
          <TimelineEntry key={item.id} item={item} onPreview={setPreview} />
        ))
      )}
      <ShotDialog item={preview} runId={runId} onClose={() => setPreview(null)} />
    </Box>
  )
}
