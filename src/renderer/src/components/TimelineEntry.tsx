import { Box, Typography } from '@mui/material'
import type { TimelineItem } from '../hooks/useAgentRun'
import { CANVAS, HAIRLINE, LINE_STRONG, SIGNAL, monoText } from '../theme'

function dotColor(item: TimelineItem): string {
  if (item.kind === 'reply') return SIGNAL
  if (item.kind === 'note') return item.tone === 'error' ? 'error.main' : LINE_STRONG
  if (item.kind === 'tool') {
    if (item.status === 'error') return 'error.main'
    if (item.status === 'running') return '#b6bdc8'
    return 'success.main'
  }
  return LINE_STRONG
}

interface Props {
  item: TimelineItem
  onPreview: (item: TimelineItem) => void
}

export default function TimelineEntry({ item, onPreview }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        pl: 2,
        pb: 1.25,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '3.5px',
          top: 15,
          bottom: 0,
          width: '1px',
          bgcolor: HAIRLINE,
        },
        '&:last-of-type::before': { display: 'none' },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: 0.5,
          top: 6,
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: dotColor(item),
          boxShadow: '0 0 0 2px #ffffff',
        }}
      />
      {item.kind === 'shot' && <ShotEntry item={item} onPreview={onPreview} />}
      {item.kind === 'reply' && <ReplyEntry item={item} />}
      {item.kind === 'note' && <NoteEntry item={item} />}
      {item.kind === 'tool' && <ToolEntry item={item} />}
    </Box>
  )
}

function NoteEntry({ item }: { item: TimelineItem }) {
  return (
    <>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          color: item.tone === 'error' ? 'error.main' : 'text.secondary',
        }}
      >
        {item.label}
      </Typography>
      {item.text && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            color: 'text.secondary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {item.text}
        </Typography>
      )}
    </>
  )
}

function ShotEntry({ item, onPreview }: Props) {
  return (
    <>
      <Typography
        sx={{
          ...monoText(11),
          color: 'text.secondary',
        }}
      >
        第 {item.step} 步 · {item.detail}
      </Typography>
      <Box
        component="img"
        src={item.image}
        alt={`第 ${item.step} 步截图`}
        onClick={() => onPreview(item)}
        sx={{
          display: 'block',
          height: 92,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          mt: 0.75,
          borderRadius: '4px',
          bgcolor: CANVAS,
          boxShadow: `0 0 0 1px ${HAIRLINE}`,
          cursor: 'pointer',
          transition: 'box-shadow 120ms ease',
          '&:hover': { boxShadow: `0 0 0 1px ${SIGNAL}, 0 4px 12px rgba(15, 23, 42, 0.08)` },
        }}
      />
    </>
  )
}

function ReplyEntry({ item }: { item: TimelineItem }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '6px',
        px: 1.25,
        py: 0.875,
      }}
    >
      <Typography sx={{ fontSize: 12.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {item.text}
      </Typography>
    </Box>
  )
}

function ToolEntry({ item }: { item: TimelineItem }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography sx={{ ...monoText(12), fontWeight: 600 }}>
          {item.name}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography
          sx={{
            ...monoText(11),
            color: 'text.disabled',
          }}
        >
          {item.durationMs != null ? `${item.durationMs}ms` : '…'}
        </Typography>
      </Box>
      <Typography
        sx={{
          ...monoText(11),
          display: 'block',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.detail}
      </Typography>
      {(item.text ?? item.progress) && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.25,
            color: item.status === 'error' ? 'error.main' : 'text.secondary',
            wordBreak: 'break-word',
          }}
        >
          {item.text ?? item.progress}
        </Typography>
      )}
    </>
  )
}
