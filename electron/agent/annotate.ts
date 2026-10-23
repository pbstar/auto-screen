import {
  createCanvas,
  loadImage,
  type Canvas,
  type SKRSContext2D,
} from '@napi-rs/canvas'
import { GRID } from '../../src/shared/ipc'
import type { CaptureResult } from '../../src/shared/types'

const MAX_EDGE = 1280
const THUMB_EDGE = 360
const GRID_COLOR = 'rgba(255, 82, 82, 0.3)'
const LABEL_COLOR = '#ffcdd2'

export interface AnnotatedShot {
  /** 发给模型的 PNG data URL */
  dataUrl: string
  /** 时间线用的 JPEG 缩略图 */
  thumb: string
  /** 模型坐标系宽高，工具上下文必须用这两个值 */
  width: number
  height: number
}

/**
 * 缩放截图并叠加标尺与网格。画布不加页边距，原图左上角严格映射到 (0, 0)，
 * 因此模型在标注图上读到的坐标可以按同一比例换算回屏幕。
 */
export async function annotateCapture(capture: CaptureResult): Promise<AnnotatedShot> {
  const scale = Math.min(1, MAX_EDGE / Math.max(capture.width, capture.height))
  const width = Math.max(1, Math.round(capture.width * scale))
  const height = Math.max(1, Math.round(capture.height * scale))
  const source = await loadImage(Buffer.from(capture.image.split(',')[1] ?? '', 'base64'))

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  drawGrid(ctx, width, height)
  drawTicks(ctx, width, height)
  drawLabels(ctx, width, height)

  return {
    dataUrl: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`,
    thumb: makeThumb(canvas, width, height),
    width,
    height,
  }
}

function drawGrid(ctx: SKRSContext2D, width: number, height: number): void {
  ctx.save()
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  for (let x = GRID.major; x < width; x += GRID.major) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
  }
  for (let y = GRID.major; y < height; y += GRID.major) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

function drawTicks(ctx: SKRSContext2D, width: number, height: number): void {
  const lenOf = (value: number) => (value % GRID.major === 0 ? 8 : 4)
  ctx.save()
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = GRID.minor; x < width; x += GRID.minor) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, lenOf(x))
  }
  for (let y = GRID.minor; y < height; y += GRID.minor) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(lenOf(y), y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

function drawText(ctx: SKRSContext2D, text: string, x: number, y: number): void {
  ctx.strokeText(text, x, y)
  ctx.fillText(text, x, y)
}

function drawLabels(ctx: SKRSContext2D, width: number, height: number): void {
  ctx.save()
  ctx.font = '12px sans-serif'
  ctx.fillStyle = LABEL_COLOR
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineWidth = 3
  for (let x = GRID.major; x < width; x += GRID.major) drawText(ctx, String(x), x + 3, 14)
  for (let y = GRID.major; y < height; y += GRID.major) drawText(ctx, String(y), 3, y + 14)
  ctx.restore()
}

function makeThumb(canvas: Canvas, width: number, height: number): string {
  const scale = Math.min(1, THUMB_EDGE / Math.max(width, height))
  const thumb = createCanvas(
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  )
  const ctx = thumb.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height)
  return `data:image/jpeg;base64,${thumb.toBuffer('image/jpeg', 70).toString('base64')}`
}
