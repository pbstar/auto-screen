import { Window as ScreenshotWindow } from 'node-screenshots'
import type { CaptureResult, MonitorInfo, WindowInfo } from '../shared/types'

type NativeWindow = InstanceType<typeof ScreenshotWindow>

function readMonitor(win: NativeWindow): MonitorInfo {
  try {
    const monitor = win.currentMonitor()
    return {
      x: monitor.x(),
      y: monitor.y(),
      width: monitor.width(),
      height: monitor.height(),
      scaleFactor: monitor.scaleFactor(),
    }
  } catch {
    return { x: 0, y: 0, width: 0, height: 0, scaleFactor: 1 }
  }
}

function toWindowInfo(win: NativeWindow): WindowInfo {
  return {
    id: win.id(),
    pid: win.pid(),
    appName: win.appName(),
    title: win.title(),
    x: win.x(),
    y: win.y(),
    width: win.width(),
    height: win.height(),
    monitor: readMonitor(win),
  }
}

export function listWindows(excludePid: number): WindowInfo[] {
  return ScreenshotWindow.all()
    .filter((win) => win.pid() !== excludePid)
    .filter((win) => !win.isMinimized() && win.width() > 0 && win.height() > 0)
    .map(toWindowInfo)
    .sort(
      (a, b) =>
        a.appName.localeCompare(b.appName, 'zh-CN') ||
        a.title.localeCompare(b.title, 'zh-CN'),
    )
}

export function findWindow(windowId: number): NativeWindow {
  const win = ScreenshotWindow.all().find((item) => item.id() === windowId)
  if (!win) {
    throw new Error('目标窗口不存在或已关闭，请刷新窗口列表')
  }
  return win
}

export function captureWindow(windowId: number): CaptureResult {
  const win = findWindow(windowId)
  const image = win.captureImageSync()
  const png = image.toPngSync(true)

  return {
    image: `data:image/png;base64,${png.toString('base64')}`,
    width: image.width,
    height: image.height,
    window: toWindowInfo(win),
  }
}

export function windowScaleFactor(win: NativeWindow): number {
  return readMonitor(win).scaleFactor || 1
}

/**
 * 把截图坐标换算成屏幕物理像素坐标。
 * node-screenshots 的窗口 bounds 可能是逻辑点，也可能是物理像素：
 * 截图宽高与 bounds 宽高的比值接近 1 说明是物理像素，接近 scaleFactor 说明是逻辑点。
 */
export function imageToPhysical(
  win: NativeWindow,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
): { x: number; y: number } {
  const boundsWidth = win.width()
  const boundsHeight = win.height()
  const scaleFactor = readMonitor(win).scaleFactor || 1
  const ratio = imageWidth / boundsWidth

  const boundsArePhysical = Math.abs(ratio - 1) <= Math.abs(ratio - scaleFactor)
  const physicalPerUnit = boundsArePhysical ? 1 : scaleFactor
  const physicalWidth = boundsWidth * physicalPerUnit
  const physicalHeight = boundsHeight * physicalPerUnit

  return {
    x: win.x() * physicalPerUnit + (x / imageWidth) * physicalWidth,
    y: win.y() * physicalPerUnit + (y / imageHeight) * physicalHeight,
  }
}
