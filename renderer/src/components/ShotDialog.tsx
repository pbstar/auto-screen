import { useEffect, useState } from 'react'
import { Box, Dialog, DialogContent, DialogTitle } from '@mui/material'
import type { TimelineItem } from '../hooks/useAgentRun'

const api = window.autoScreen

interface Props {
  item: TimelineItem | null
  /** 当前运行的 runId，用于从运行记录里取原始标注图 */
  runId: string
  onClose: () => void
}

export default function ShotDialog({ item, runId, onClose }: Props) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!item) {
      setSrc('')
      return
    }
    setSrc(item.image ?? '')
    if (!runId) return

    let cancelled = false
    void (async () => {
      const result = await api.readRunShot(runId, item.step)
      // 取不到原图时保留缩略图，弹窗仍然可用
      if (!cancelled && result.ok && result.data) setSrc(result.data)
    })()
    return () => {
      cancelled = true
    }
  }, [item, runId])

  return (
    <Dialog open={item != null} onClose={onClose} maxWidth="xl">
      <DialogTitle sx={{ fontSize: 13, fontWeight: 600, py: 1.25 }}>
        第 {item?.step ?? 0} 步截图 · {item?.detail ?? ''}
      </DialogTitle>
      <DialogContent sx={{ p: 1.5, pt: '0 !important' }}>
        <Box
          component="img"
          src={src}
          alt="步骤截图"
          sx={{
            display: 'block',
            maxWidth: '90vw',
            maxHeight: '78vh',
            objectFit: 'contain',
            borderRadius: '4px',
            border: 1,
            borderColor: 'divider',
            bgcolor: '#f6f7f9',
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
