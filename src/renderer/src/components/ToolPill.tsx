import { useEffect, useState } from 'react'
import type { ToolSummary } from '@shared/types'
import PopoverPill from './PopoverPill'
import ToolList from './ToolList'

const api = window.autoScreen

/** 工具清单是静态参考，收进浮层，不占固定版面 */
export default function ToolPill() {
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void api.listTools().then((result) => {
      if (result.ok) setTools(result.data)
      else setError(result.error)
    })
  }, [])

  return (
    <PopoverPill label="工具" detail={tools.length > 0 ? String(tools.length) : undefined}>
      <ToolList tools={tools} error={error} />
    </PopoverPill>
  )
}
