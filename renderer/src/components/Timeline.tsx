import { useEffect, useRef } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import type { TimelineItem } from '../hooks/useAgentRun'

interface Props {
  items: TimelineItem[]
}

export default function Timeline({ items }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [items.length])

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        输入任务后点开始，这里会显示每一步
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
      <div ref={endRef} />
    </Box>
  )
}

function Item({ item }: { item: TimelineItem }) {
  if (item.kind === 'shot') {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary">
          第 {item.step} 步 · 截图 {item.detail}
        </Typography>
        <Box
          component="img"
          src={item.image}
          alt={`第 ${item.step} 步截图`}
          sx={{ display: 'block', width: '100%', mt: 0.5, border: 1, borderColor: 'divider' }}
        />
      </Box>
    )
  }

  if (item.kind === 'reply') {
    return (
      <Box sx={{ p: 1, bgcolor: 'action.hover' }}>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {item.text}
        </Typography>
      </Box>
    )
  }

  const color = item.status === 'error' ? 'error' : item.status === 'running' ? 'default' : 'success'
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Chip
        size="small"
        label={item.name}
        color={color}
        variant={item.status === 'running' ? 'outlined' : 'filled'}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {item.detail}
        </Typography>
        {item.text && (
          <Typography
            variant="caption"
            color={item.status === 'error' ? 'error' : 'text.secondary'}
            sx={{ display: 'block' }}
          >
            {item.text}
          </Typography>
        )}
      </Box>
      {item.durationMs != null && (
        <Typography variant="caption" color="text.secondary">
          {item.durationMs}ms
        </Typography>
      )}
    </Box>
  )
}
