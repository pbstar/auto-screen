import { desktopCapturer, session } from 'electron'

/**
 * getDisplayMedia 不接收参数，靠这里记录当前要捕获的窗口。
 * 窗口 id 来自 node-screenshots，与 desktopCapturer 的 source id 同源。
 */
let targetSource: Electron.DesktopCapturerSource | null = null

/** desktopCapturer 的 source id 形如 window:<CGWindowID>:0 */
function windowIdOf(sourceId: string): number | null {
  const [kind, raw] = sourceId.split(':')
  if (kind !== 'window') return null
  const id = Number(raw)
  return Number.isInteger(id) ? id : null
}

async function findSource(windowId: number): Promise<Electron.DesktopCapturerSource | null> {
  try {
    const sources = await desktopCapturer.getSources({ types: ['window'], fetchWindowIcons: false })
    return sources.find((source) => windowIdOf(source.id) === windowId) ?? null
  } catch {
    // 多半是没给「屏幕录制」权限，交给渲染层提示
    return null
  }
}

/**
 * 先解析一次源并缓存：渲染层据此决定要不要调 getDisplayMedia，
 * handler 里直接用缓存，避免两次解析结果不一致。
 * 返回 false 表示系统没有返回这个窗口的画面源（最小化、无标题或权限不足）。
 */
export async function setStreamTarget(windowId: number | null): Promise<boolean> {
  targetSource = windowId == null ? null : await findSource(windowId)
  return targetSource != null
}

/** 主进程自己挑源，不弹系统选择器 */
export function registerStreamHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    callback(targetSource ? { video: targetSource } : {})
  })
}
