import { useCallback, useEffect, useRef, useState } from 'react'

const api = window.autoScreen

interface StreamSize {
  width: number
  height: number
}

function describeError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError') {
    return '无法捕获该窗口，请确认已授予屏幕录制权限'
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * 用 getDisplayMedia 拉目标窗口的实时视频流，切换窗口或卸载时释放。
 * 具体捕获哪个窗口由主进程的 displayMedia handler 决定。
 */
export function useWindowStream(windowId: number | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [size, setSize] = useState<StreamSize>({ width: 0, height: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    setSize({ width: 0, height: 0 })
    setError('')
    if (windowId == null) {
      void api.setStreamTarget(null)
      return
    }

    let cancelled = false
    let stream: MediaStream | null = null

    void (async () => {
      try {
        const target = await api.setStreamTarget(windowId)
        if (!target.ok) throw new Error(target.error)
        if (!target.data) {
          if (!cancelled) setError('该窗口当前无法捕获画面，请换一个窗口')
          return
        }
        const media = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (video) {
          video.srcObject = media
          await video.play().catch(() => undefined)
        }
      } catch (caught) {
        if (!cancelled) setError(describeError(caught))
      }
    })()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
      const video = videoRef.current
      if (video) video.srcObject = null
    }
  }, [windowId])

  /** 窗口被缩放时视频分辨率会变，读数与网格都按最新尺寸算 */
  const syncSize = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return
    setSize({ width: video.videoWidth, height: video.videoHeight })
  }, [])

  return { videoRef, size, error, syncSize }
}
