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
/** 内容四周的留白：坐标数字画在这里，不压界面。16px 放不下三位数加刻度，用 20px */
const MARGIN = 20
const MARGIN_COLOR = '#111827'
const FRAME_COLOR = '#ffffff'
const GRID_COLOR = 'rgba(255, 82, 82, 0.4)'
const TICK_COLOR = 'rgba(255, 255, 255, 0.5)'
const CELL_COLOR = 'rgba(255, 255, 255, 0.045)'
const LABEL_COLOR = '#ffcdd2'
const MARK_COLOR = '#22d3ee'
/** 顶部数字居中不挤，左侧要给三位数留够宽度 */
const TOP_FONT = '9px sans-serif'
const SIDE_FONT = '8px sans-serif'

/** 上一次指针动作的落点，画在下一张截图上，模型据此判断有没有点偏 */
export interface ClickMark {
  x: number
  y: number
}

export interface AnnotatedShot {
  /** 发给模型的 PNG data URL（含四周留白） */
  dataUrl: string
  /** 时间线用的 JPEG 缩略图 */
  thumb: string
  /** 白框内窗口内容的宽，坐标与工具上下文都用这个尺寸 */
  width: number
  height: number
}

/**
 * 缩放截图并叠加坐标辅助层。窗口内容从 (MARGIN, MARGIN) 开始，
 * 白框内的左上角仍然是坐标原点 (0, 0)，框外的留白只放刻度不参与坐标。
 */
export async function annotateCapture(
  capture: CaptureResult,
  mark: ClickMark | null = null,
): Promise<AnnotatedShot> {
  const scale = Math.min(1, MAX_EDGE / Math.max(capture.width, capture.height))
  const width = Math.max(1, Math.round(capture.width * scale))
  const height = Math.max(1, Math.round(capture.height * scale))
  const source = await loadImage(Buffer.from(capture.image.split(',')[1] ?? '', 'base64'))

  const canvas = createCanvas(width + MARGIN * 2, height + MARGIN * 2)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = MARGIN_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, MARGIN, MARGIN, width, height)

  const major = gridMajor(Math.max(width, height))
  drawCells(ctx, width, height, major)
  drawGrid(ctx, width, height, major)
  drawTicks(ctx, width, height, major)
  drawLabels(ctx, width, height, major)
  drawFrame(ctx, width, height)
  if (mark) drawMark(ctx, width, height, mark)

  return {
    dataUrl: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`,
    thumb: makeThumb(canvas, canvas.width, canvas.height),
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
      const right = Math.min(major, width - x)
      const bottom = Math.min(major, height - y)
      ctx.fillRect(MARGIN + x, MARGIN + y, right, bottom)
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
    ctx.moveTo(MARGIN + x + 0.5, MARGIN)
    ctx.lineTo(MARGIN + x + 0.5, MARGIN + height)
  }
  for (let y = major; y < height; y += major) {
    ctx.moveTo(MARGIN, MARGIN + y + 0.5)
    ctx.lineTo(MARGIN + width, MARGIN + y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

/** 刻度画在白框外侧的留白里，指回内容边缘但不遮挡内容 */
function drawTicks(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  const lenOf = (value: number) => (value % major === 0 ? 6 : 4)
  ctx.save()
  ctx.strokeStyle = TICK_COLOR
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = GRID.minor; x < width; x += GRID.minor) {
    ctx.moveTo(MARGIN + x + 0.5, MARGIN)
    ctx.lineTo(MARGIN + x + 0.5, MARGIN - lenOf(x))
  }
  for (let y = GRID.minor; y < height; y += GRID.minor) {
    ctx.moveTo(MARGIN, MARGIN + y + 0.5)
    ctx.lineTo(MARGIN - lenOf(y), MARGIN + y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

/** 每条主格线都在留白里标绝对坐标，模型不用靠数刻度推算 */
function drawLabels(ctx: SKRSContext2D, width: number, height: number, major: number): void {
  ctx.save()
  ctx.fillStyle = LABEL_COLOR
  ctx.font = TOP_FONT
  ctx.textAlign = 'center'
  for (let x = major; x < width; x += major) {
    ctx.fillText(String(x), MARGIN + x, MARGIN - 8)
  }
  ctx.font = SIDE_FONT
  ctx.textAlign = 'right'
  for (let y = major; y < height; y += major) {
    ctx.fillText(String(y), MARGIN - 7, MARGIN + y + 3)
  }
  // 原点单独标一个 0，钉住坐标起点
  ctx.font = TOP_FONT
  ctx.fillText('0', MARGIN - 7, MARGIN - 8)
  ctx.restore()
}

function drawFrame(ctx: SKRSContext2D, width: number, height: number): void {
  ctx.save()
  ctx.strokeStyle = FRAME_COLOR
  ctx.lineWidth = 2
  ctx.strokeRect(MARGIN - 1, MARGIN - 1, width + 2, height + 2)
  ctx.restore()
}

/** 十字准星 + 坐标文字，标出上一次指针动作落在哪里 */
function drawMark(
  ctx: SKRSContext2D,
  width: number,
  height: number,
  mark: ClickMark,
): void {
  const x = MARGIN + mark.x
  const y = MARGIN + mark.y
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

  // 文字放进底部留白，别盖住窗口内容
  ctx.font = 'bold 11px sans-serif'
  ctx.fillStyle = MARK_COLOR
  const label = `上次点击 (${mark.x}, ${mark.y})`
  const canvasWidth = width + MARGIN * 2
  const labelX = Math.max(3, Math.min(x - 40, canvasWidth - 108))
  const labelY = height + MARGIN * 2 - 4
  ctx.fillText(label, labelX, labelY)
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
