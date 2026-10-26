import {
  createCanvas,
  loadImage,
  type Canvas,
  type SKRSContext2D,
} from '@napi-rs/canvas'
import { GRID, GRID_STYLE, gridMajor } from '../../src/shared/ipc'
import type { CaptureResult } from '../../src/shared/types'

const MAX_EDGE = 1280
const THUMB_EDGE = 360
const MARK_COLOR = '#22d3ee'
const LABEL_FONT = `bold ${GRID_STYLE.labelSize}px sans-serif`
/** 准星臂长，14px 的小十字，不盖按钮 */
const MARK_ARM = 7

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
 * 图片坐标就是工具坐标——加留白会多出一套坐标系，模型实测会读歪。
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
  drawGrid(ctx, width, height, major)
  drawTicks(ctx, width, height, major)
  drawLabels(ctx, width, height, major)
  if (mark) drawMark(ctx, mark)

  return {
    dataUrl: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`,
    thumb: makeThumb(canvas, width, height),
    width,
    height,
  }
}

/** 主格虚线，样式与界面预览同源 */
function drawGrid(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  ctx.save()
  ctx.strokeStyle = GRID_STYLE.line
  ctx.lineWidth = 1
  ctx.setLineDash([...GRID_STYLE.dash])
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
  const lenOf = (value: number) =>
    value % major === 0 ? GRID_STYLE.majorTick : GRID_STYLE.minorTick
  ctx.save()
  ctx.strokeStyle = GRID_STYLE.tick
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

/** 每条主格线都标绝对坐标，模型不用靠数刻度推算；标签统一落在线的下方 */
function drawLabels(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  ctx.save()
  ctx.font = LABEL_FONT
  ctx.fillStyle = GRID_STYLE.label
  ctx.strokeStyle = GRID_STYLE.labelStroke
  ctx.lineWidth = GRID_STYLE.labelStrokeWidth
  ctx.lineJoin = 'round'
  // 贴边的标签画不下就不画，挪位置会和相邻标签压在一起
  const label = (text: string, x: number, y: number) => {
    if (x + ctx.measureText(text).width + 2 > width || y + 2 > height) return
    drawText(ctx, text, x, y)
  }
  label('0', 3, GRID_STYLE.labelGap)
  for (let x = major; x < width; x += major) label(String(x), x + 3, GRID_STYLE.labelGap)
  for (let y = major; y < height; y += major) label(String(y), 3, y + GRID_STYLE.labelGap)
  ctx.restore()
}

/** 小十字标出上一次指针动作的落点，够看清位置又不挡内容 */
function drawMark(ctx: SKRSContext2D, mark: ClickMark): void {
  const { x, y } = mark
  ctx.save()
  // 先描一道深色让它在浅色界面上也看得见
  for (const [color, width] of [['rgba(0, 0, 0, 0.55)', 4], [MARK_COLOR, 2]] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x - MARK_ARM, y)
    ctx.lineTo(x + MARK_ARM, y)
    ctx.moveTo(x, y - MARK_ARM)
    ctx.lineTo(x, y + MARK_ARM)
    ctx.stroke()
  }
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
