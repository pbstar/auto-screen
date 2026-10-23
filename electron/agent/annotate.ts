import {
  createCanvas,
  loadImage,
  type Canvas,
  type SKRSContext2D,
} from '@napi-rs/canvas'
import { GRID, gridMajor } from '../../src/shared/ipc'
import type { CaptureResult } from '../../src/shared/types'

const MAX_EDGE = 1280
const THUMB_EDGE = 360
const GRID_COLOR = 'rgba(255, 82, 82, 0.4)'
const CELL_COLOR = 'rgba(255, 255, 255, 0.045)'
const LABEL_COLOR = '#ffcdd2'
const MARK_COLOR = '#22d3ee'

/** 上一次指针动作的落点，画在下一张截图上，模型据此判断有没有点偏 */
export interface ClickMark {
  x: number
  y: number
}

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
 * 缩放截图并叠加坐标辅助层。画布不加页边距，原图左上角严格映射到 (0, 0)，
 * 因此模型在标注图上读到的坐标可以按同一比例换算回屏幕。
 */
export async function annotateCapture(
  capture: CaptureResult,
  mark: ClickMark | null = null,
): Promise<AnnotatedShot> {
  const scale = Math.min(1, MAX_EDGE / Math.max(capture.width, capture.height))
  const width = Math.max(1, Math.round(capture.width * scale))
  const height = Math.max(1, Math.round(capture.height * scale))
  const source = await loadImage(Buffer.from(capture.image.split(',')[1] ?? '', 'base64'))

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)

  const major = gridMajor(Math.max(width, height))
  drawCells(ctx, width, height, major)
  drawGrid(ctx, width, height, major)
  drawTicks(ctx, width, height, major)
  drawLabels(ctx, width, height, major)
  if (mark) drawMark(ctx, width, height, mark)

  return {
    dataUrl: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`,
    thumb: makeThumb(canvas, width, height),
    width,
    height,
  }
}

/** 相邻主格交替铺一层极淡底色，数格子比数刻度线可靠 */
function drawCells(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  ctx.save()
  ctx.fillStyle = CELL_COLOR
  for (let x = 0, col = 0; x < width; x += major, col += 1) {
    for (let y = 0, row = 0; y < height; y += major, row += 1) {
      if ((col + row) % 2 === 0) continue
      ctx.fillRect(x, y, Math.min(major, width - x), Math.min(major, height - y))
    }
  }
  ctx.restore()
}

function drawGrid(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  ctx.save()
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  for (let x = major; x < width; x += major) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
  }
  for (let y = major; y < height; y += major) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

function drawTicks(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  const lenOf = (value: number) => (value % major === 0 ? 8 : 4)
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

/** 每条主格线都标绝对坐标，模型不用再靠数刻度推算 */
function drawLabels(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  ctx.save()
  ctx.font = '12px sans-serif'
  ctx.fillStyle = LABEL_COLOR
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineWidth = 3
  for (let x = major; x < width; x += major) drawText(ctx, String(x), x + 3, 14)
  for (let y = major; y < height; y += major) drawText(ctx, String(y), 3, y + 14)
  ctx.restore()
}

/** 十字准星 + 坐标文字，标出上一次指针动作落在哪里 */
function drawMark(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  mark: ClickMark,
): void {
  const { x, y } = mark
  ctx.save()
  ctx.strokeStyle = MARK_COLOR
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.moveTo(x - 22, y)
  ctx.lineTo(x + 22, y)
  ctx.moveTo(x, y - 22)
  ctx.lineTo(x, y + 22)
  ctx.stroke()

  ctx.font = 'bold 12px sans-serif'
  ctx.fillStyle = MARK_COLOR
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.lineWidth = 3
  const label = `上次点击 (${x}, ${y})`
  const labelX = Math.max(3, Math.min(x + 16, width - 120))
  const labelY = Math.max(28, Math.min(y - 16, height - 6))
  drawText(ctx, label, labelX, labelY)
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
