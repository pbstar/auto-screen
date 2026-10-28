import { useState } from 'react'
import { Box, Button, Checkbox, Radio, Stack, TextField, Typography } from '@mui/material'
import { WASH } from '../theme'
import type { PendingQuestion } from '@shared/agent'

interface Props {
  question: PendingQuestion
  disabled: boolean
  onAnswer: (answer: string | null) => Promise<void>
}

/** 提问是运行中唯一需要人动手的环节，卡片固定在时间线上方，不随日志滚走 */
export default function QuestionCard({ question, disabled, onAnswer }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [other, setOther] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggle = (label: string): void => {
    if (disabled) return
    setSelected((previous) => {
      if (question.multiple) {
        return previous.includes(label)
          ? previous.filter((item) => item !== label)
          : [...previous, label]
      }
      return previous.includes(label) ? [] : [label]
    })
  }

  const picked = question.options
    .filter((option) => selected.includes(option.label))
    .map((option) => option.label)
  const value = [...picked, other.trim()].filter(Boolean).join('；')

  const submit = async (answer: string | null): Promise<void> => {
    if (disabled || submitting) return
    setSubmitting(true)
    try {
      await onAnswer(answer)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        flex: 'none',
        maxHeight: '46vh',
        overflowY: 'auto',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'rgba(43, 108, 246, 0.05)',
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        需要你确认 · 第 {question.step} 步
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.25, mb: 1 }}>
        {question.question}
      </Typography>

      {question.options.map((option) => {
        const checked = selected.includes(option.label)
        return (
          <Box
            key={option.label}
            onClick={() => toggle(option.label)}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.75,
              px: 0.5,
              py: 0.5,
              borderRadius: 1,
              cursor: disabled ? 'default' : 'pointer',
              '&:hover': { bgcolor: disabled ? 'transparent' : WASH },
            }}
          >
            {question.multiple ? (
              <Checkbox readOnly size="small" checked={checked} sx={{ p: 0.25 }} />
            ) : (
              <Radio readOnly size="small" checked={checked} sx={{ p: 0.25 }} />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12.5 }}>{option.label}</Typography>
              {option.description && (
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}
                >
                  {option.description}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}

      <TextField
        fullWidth
        size="small"
        placeholder="其它答案（可选）"
        value={other}
        disabled={disabled || submitting}
        onChange={(event) => setOther(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && value) void submit(value)
        }}
        sx={{
          mt: 1,
          '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', fontSize: 13 },
        }}
      />

      <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'flex-end' }}>
        <Button
          disabled={disabled || submitting}
          onClick={() => void submit(null)}
          sx={{ color: 'text.secondary' }}
        >
          跳过
        </Button>
        <Button
          variant="contained"
          disabled={disabled || submitting || value.length === 0}
          onClick={() => void submit(value)}
        >
          回答
        </Button>
      </Stack>
    </Box>
  )
}
