import { Box, Typography } from '@mui/material'
import type { TimelineItem } from '../hooks/useAgentRun'
import { MONO_FONT } from '../theme'

function dotColor(item: TimelineItem): string {
  if (item.kind === 'reply') return '#2563eb'
  if (item.kind === 'tool') {
    if (item.status === 'error') return '#dc2626'
    if (item.status === 'running') return '#9ca3af'
    return '#16a34a'
  }
  return '#c4c9d1'
}

export default function TimelineEntry({ item }: { item: TimelineItem }) {
  return (
    <Box
      sx={{
        position: 'relative',
        pl: 2.25,
        pb: 1.25,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '3.5px',
          top: 13,
          bottom: 0,
          width: '1px',
          bgcolor: '#e6e8eb',
        },
        '&:last-child::before': { display: 'none' },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 5,
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: dotColor(item),
        }}
      />
      {item.kind === 'shot' && <ShotEntry item={item} />}
      {item.kind === 'reply' && <ReplyEntry item={item} />}
      {item.kind === 'tool' && <ToolEntry item={item} />}
    </Box>
  )
}

function ShotEntry({ item }: { item: TimelineItem }) {
  return (
    <>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO_FONT }}>
        第 {item.step} 步 · 截图 {item.detail}
      </Typography>
      <Box
        component="img"
        src={item.image}
        alt={`第 ${item.step} 步截图`}
        sx={{
          display: 'block',
          width: '100%',
          mt: 0.5,
          borderRadius: '4px',
          border: 1,
          borderColor: 'divider',
        }}
      />
    </>
  )
}

function ReplyEntry({ item }: { item: TimelineItem }) {
  return (
    <Box sx={{ bgcolor: '#f6f7f9', borderRadius: '4px', px: 1.25, py: 0.75 }}>
      <Typography sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {item.text}
      </Typography>
    </Box>
  )
}

function ToolEntry({ item }: { item: TimelineItem }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: 12, fontWeight: 600 }}>
          {item.name}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO_FONT }}>
          {item.durationMs != null ? `${item.durationMs}ms` : '…'}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontFamily: MONO_FONT,
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.detail}
      </Typography>
      {item.text && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            color: item.status === 'error' ? 'error.main' : 'text.secondary',
            wordBreak: 'break-word',
          }}
        >
          {item.text}
        </Typography>
      )}
    </>
  )
}
