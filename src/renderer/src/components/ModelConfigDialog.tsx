import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import type { ModelSettings } from '@shared/types'

const api = window.autoScreen

interface Props {
  open: boolean
  onClose: () => void
  /** 保存成功后通知外层刷新状态，Key 是否就绪会变 */
  onSaved: () => void
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function ModelConfigDialog({ open, onClose, onSaved }: Props) {
  const [settings, setSettings] = useState<ModelSettings | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setApiKey('')
    void (async () => {
      const result = await api.getModelSettings()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSettings(result.data)
      setBaseUrl(result.data.baseUrl)
      setModel(result.data.model)
    })()
  }, [open])

  const save = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const result = await api.saveModelSettings({
        baseUrl,
        model,
        apiKey: apiKey.trim() || undefined,
      })
      if (!result.ok) throw new Error(result.error)
      onSaved()
      onClose()
    } catch (caught) {
      setError(messageOf(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 600, py: 1.75 }}>配置模型</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, pt: '8px !important' }}>
        <TextField
          label="接口地址"
          size="small"
          fullWidth
          value={baseUrl}
          placeholder="https://api.deepseek.com"
          onChange={(event) => setBaseUrl(event.target.value)}
        />
        <TextField
          label="模型 ID"
          size="small"
          fullWidth
          value={model}
          placeholder="deepseek-flash"
          onChange={(event) => setModel(event.target.value)}
        />
        <TextField
          label="API Key"
          size="small"
          fullWidth
          type="password"
          autoComplete="off"
          value={apiKey}
          placeholder={
            settings?.apiKeySet ? `已配置 ${settings.apiKeyHint}，留空沿用` : 'sk-…'
          }
          onChange={(event) => setApiKey(event.target.value)}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          Key 只保存在本机（userData/model.json），不会写进日志，也不会回显到界面；
          保存后立即生效，不用重启。
        </Typography>
        {error && (
          <Typography variant="caption" sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
