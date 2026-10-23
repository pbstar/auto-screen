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
const MARGIN_COLOR = '#111827'
const FRAME_COLOR = '#ffffff'
const GRID_COLOR = 'rgba(255, 82, 82, 0.4)'
const TICK_COLOR = 'rgba(255, 255, 255, 0.5)'
const CELL_COLOR = 'rgba(255, 255, 255, 0.045)'
const LABEL_COLOR = '#ffcdd2'
const MARK_COLOR = '#22d3ee'
const LABEL_FONT = '9px sans-serif'
const TICK_MAJOR = 6
const TICK_MINOR = 4
const LABEL_GAP = 3
const TOP_MARGIN = 20
/** 右边和下边不放数字，留一点把白框露出来就够 */
const EDGE_MARGIN = 8
/** 准星臂长，14px 的小十字，不盖按钮 */
const MARK_ARM = 7

/** 窗口内容在画布上的位置与尺寸 */
interface Frame {
  x: number
  y: number
  width: number
  height: number
}

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
 * 缩放截图并叠加坐标辅助层。白框内的左上角是坐标原点 (0, 0)，
 * 刻度和数字画在框外留白里，不遮挡界面内容。
 */
export async function annotateCapture(
  capture: CaptureResult,
  mark: ClickMark | null = null,
): Promise<AnnotatedShot> {
  const scale = Math.min(1, MAX_EDGE / Math.max(capture.width, capture.height))
  const width = Math.max(1, Math.round(capture.width * scale))
  const height = Math.max(1, Math.round(capture.height * scale))
  const major = gridMajor(Math.max(width, height))
  const leftMargin = sideMargin(height, major)
  const source = await loadImage(Buffer.from(capture.image.split(',')[1] ?? '', 'base64'))

  const canvas = createCanvas(width + leftMargin + EDGE_MARGIN, height + TOP_MARGIN + EDGE_MARGIN)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = MARGIN_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'

  const frame: Frame = { x: leftMargin, y: TOP_MARGIN, width, height }
  ctx.drawImage(source, frame.x, frame.y, width, height)
  drawCells(ctx, frame, major)
  drawGrid(ctx, frame, major)
  drawTicks(ctx, frame, major)
  drawLabels(ctx, frame, major)
  drawFrame(ctx, frame)
  if (mark) drawMark(ctx, frame, mark)

  return {
    dataUrl: `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`,
    thumb: makeThumb(canvas, canvas.width, canvas.height),
    width,
    height,
  }
}

/** 左边距按最长坐标数字实测宽度算，四位数也不会被裁 */
function sideMargin(height: number, major: number): number {
  const widest = String(Math.floor((height - 1) / major) * major)
  const probe = createCanvas(1, 1).getContext('2d')
  probe.font = LABEL_FONT
  const textWidth = Math.ceil(probe.measureText(widest).width)
  return textWidth + TICK_MAJOR + LABEL_GAP + 1
}

/** 相邻主格交替铺一层极淡底色，数格子比数刻度线可靠 */
function drawCells(ctx: SKRSContext2D, frame: Frame, major: number): void {
  ctx.save()
  ctx.fillStyle = CELL_COLOR
  for (let x = 0, col = 0; x < frame.width; x += major, col += 1) {
    for (let y = 0, row = 0; y < frame.height; y += major, row += 1) {
      if ((col + row) % 2 === 0) continue
      const right = Math.min(major, frame.width - x)
      const bottom = Math.min(major, frame.height - y)
      ctx.fillRect(frame.x + x, frame.y + y, right, bottom)
    }
  }
  ctx.restore()
}

function drawGrid(ctx: SKRSContext2D, frame: Frame, major: number): void {
  ctx.save()
  ctx.strokeStyle = GRID_COLOR
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  for (let x = major; x < frame.width; x += major) {
    ctx.moveTo(frame.x + x + 0.5, frame.y)
    ctx.lineTo(frame.x + x + 0.5, frame.y + frame.height)
  }
  for (let y = major; y < frame.height; y += major) {
    ctx.moveTo(frame.x, frame.y + y + 0.5)
    ctx.lineTo(frame.x + frame.width, frame.y + y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

/** 刻度画在白框外侧的留白里，指回内容边缘但不遮挡内容 */
function drawTicks(ctx: SKRSContext2D, frame: Frame, major: number): void {
  const lenOf = (value: number) => (value % major === 0 ? TICK_MAJOR : TICK_MINOR)
  ctx.save()
  ctx.strokeStyle = TICK_COLOR
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = GRID.minor; x < frame.width; x += GRID.minor) {
    ctx.moveTo(frame.x + x + 0.5, frame.y)
    ctx.lineTo(frame.x + x + 0.5, frame.y - lenOf(x))
  }
  for (let y = GRID.minor; y < frame.height; y += GRID.minor) {
    ctx.moveTo(frame.x, frame.y + y + 0.5)
    ctx.lineTo(frame.x - lenOf(y), frame.y + y + 0.5)
  }
  ctx.stroke()
  ctx.restore()
}

/** 每条主格线都在留白里标绝对坐标，模型不用靠数刻度推算 */
function drawLabels(ctx: SKRSContext2D, frame: Frame, major: number): void {
  ctx.save()
  ctx.fillStyle = LABEL_COLOR
  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  for (let x = major; x < frame.width; x += major) {
    ctx.fillText(String(x), frame.x + x, frame.y - TICK_MAJOR - LABEL_GAP)
  }
  ctx.textAlign = 'right'
  for (let y = major; y < frame.height; y += major) {
    ctx.fillText(String(y), frame.x - TICK_MAJOR - LABEL_GAP, frame.y + y + 3)
  }
  // 原点单独标一个 0，钉住坐标起点
  ctx.fillText('0', frame.x - TICK_MAJOR - LABEL_GAP, frame.y - TICK_MAJOR - LABEL_GAP)
  ctx.restore()
}

function drawFrame(ctx: SKRSContext2D, frame: Frame): void {
  ctx.save()
  ctx.strokeStyle = FRAME_COLOR
  ctx.lineWidth = 2
  ctx.strokeRect(frame.x - 1, frame.y - 1, frame.width + 2, frame.height + 2)
  ctx.restore()
}

/** 小十字标出上一次指针动作的落点，够看清位置又不挡内容 */
function drawMark(ctx: SKRSContext2D, frame: Frame, mark: ClickMark): void {
  const x = frame.x + mark.x
  const y = frame.y + mark.y
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
